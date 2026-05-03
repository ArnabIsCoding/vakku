
import json
import os
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import firestore
from firebase_functions import https_fn, options
import google.cloud.firestore

from google import genai
from google.genai import types as genai_types
firebase_admin.initialize_app()

def _db() -> google.cloud.firestore.Client:
    return firestore.client()

PROJECT_ID = os.environ.get("GCLOUD_PROJECT", "vakku-2980f")
gemini_client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location="global",
)

GEMINI_MODEL = "gemini-2.5-flash"
LIMIT_AUTH = 5
LIMIT_ANON = 1


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def enforce_rate_limit(req: https_fn.CallableRequest, fn_name: str) -> int:
    """
    Increment a Firestore counter for this user/client + day.
    Raises RESOURCE_EXHAUSTED if the daily limit is already hit.
    """
    today = today_str()
    uid   = req.auth.uid if req.auth else None

    if uid:
        limit_key = f"auth_{uid}_{fn_name}_{today}"
        limit     = LIMIT_AUTH
    else:
        data = req.data or {}
        client_id = data.get("clientId", "unknown_anon_user")
        limit_key = f"anon_{client_id}_{fn_name}_{today}"
        limit     = LIMIT_ANON

    ref  = _db().collection("rate_limits").document(limit_key)
    snap = ref.get()
    ts   = firestore.SERVER_TIMESTAMP

    if snap.exists:
        count = snap.to_dict().get("count", 0)
        if count >= limit:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
                message=f"Daily limit of {limit} reached. Sign in for higher limits.",
            )
        ref.update({"count": google.cloud.firestore.Increment(1), "updatedAt": ts})
        return count + 1
    else:
        ref.set({"count": 1, "uid": uid, "createdAt": ts, "updatedAt": ts})
        return 1


def call_gemini(prompt: str) -> dict:
    """
    Call gemini-2.5-flash via the Google Gen AI SDK (Vertex AI backend)
    and parse the JSON response.
    response_mime_type="application/json" forces clean JSON output.
    """
    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )
    text = response.text
    clean = text.replace("```json", "").replace("```", "").strip()
    return json.loads(clean)


def cache_get(collection: str, key: str, max_age_ms: int) -> dict | None:
    ref  = _db().collection(collection).document(key)
    snap = ref.get()
    if not snap.exists:
        return None
    data      = snap.to_dict()
    cached_at = data.get("cachedAt")
    if not cached_at:
        return None
    age_ms = (datetime.now(timezone.utc).timestamp() - cached_at.timestamp()) * 1000
    return data.get("result") if age_ms < max_age_ms else None


def cache_set(collection: str, key: str, result: dict) -> None:
    _db().collection(collection).document(key).set(
        {"result": result, "cachedAt": firestore.SERVER_TIMESTAMP}
    )


def require(data: dict, *keys: str) -> None:
    missing = [k for k in keys if not data.get(k, "").strip()]
    if missing:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message=f"Missing required fields: {', '.join(missing)}",
        )

@https_fn.on_call(region="asia-south1", max_instances=10)
def analyse_party_consequences(req: https_fn.CallableRequest) -> dict:
    enforce_rate_limit(req, "analyse")

    data          = req.data or {}
    state         = data.get("state", "").strip()
    election_type = data.get("electionType", "").strip()
    require(data, "state", "electionType")

    cache_key = f"{state}_{election_type}".replace(" ", "_").lower()
    cached    = cache_get("consequence_cache", cache_key, 86_400_000)
    if cached:
        return cached

    election_label = "Lok Sabha (General)" if election_type == "lok_sabha" else "Vidhan Sabha (State)"

    prompt = f"""You are an expert Indian political analyst. Analyse historic consequences for {state} in {election_label} elections across three scenarios.

Scenarios:
- ruling: incumbent party wins again
- opposition: main opposition wins (power change)
- abstain: low turnout / voter doesn't vote

For each scenario use real post-1980 data to estimate:
- gdpGrowthDelta: GDP growth rate change (pp) in 5 years post-election vs 5 years prior
- infraScore: infrastructure investment score 0-10
- socialIndex: social development index 0-10
- employmentDelta: employment growth change (pp)
- summary: 2-3 sentence plain-English summary
- historicExamples: exactly 2 real examples e.g. "2004: Congress win in Maharashtra led to..."
- confidence: data quality score 50-95

Return ONLY this JSON, no other text:
{{
  "state": "{state}",
  "electionType": "{election_type}",
  "ruling":     {{"scenario":"ruling",     "gdpGrowthDelta":0,"infraScore":0,"socialIndex":0,"employmentDelta":0,"summary":"","historicExamples":["",""],"confidence":0}},
  "opposition": {{"scenario":"opposition", "gdpGrowthDelta":0,"infraScore":0,"socialIndex":0,"employmentDelta":0,"summary":"","historicExamples":["",""],"confidence":0}},
  "abstain":    {{"scenario":"abstain",    "gdpGrowthDelta":0,"infraScore":0,"socialIndex":0,"employmentDelta":0,"summary":"","historicExamples":["",""],"confidence":0}},
  "dataNote": ""
}}"""

    try:
        result = call_gemini(prompt)
        cache_set("consequence_cache", cache_key, result)
        return result
    except (json.JSONDecodeError, ValueError, IndexError, KeyError) as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message="AI analysis failed. Please try again.",
        ) from e

@https_fn.on_call(region="asia-south1", max_instances=10)
def get_best_voting_time(req: https_fn.CallableRequest) -> dict:
    enforce_rate_limit(req, "bestTime")

    data         = req.data or {}
    state        = data.get("state", "").strip()
    constituency = data.get("constituency", "").strip()
    require(data, "state")

    cache_key = f"{state}_{constituency or 'all'}".replace(" ", "_").lower()
    cached    = cache_get("best_time_cache", cache_key, 86_400_000 * 7)
    if cached:
        return cached

    con_clause = f", specifically the {constituency} constituency," if constituency else ""

    prompt = f"""You are an expert on Indian election logistics and ECI historical turnout data.

Provide an hourly crowd forecast for a typical election day in {state}{con_clause}.
Polling hours: 7:00 AM to 5:00 PM (11 hours). Use real patterns (high morning, low midday, high late afternoon).

Return ONLY this JSON:
{{
  "state": "{state}",
  "constituency": "{constituency or 'General'}",
  "recommendedSlot": "",
  "hourlyData": [
    {{"hour":"07:00 AM","label":"7 AM", "crowdIndex":0,"waitMinutes":0,"level":"low"}},
    {{"hour":"08:00 AM","label":"8 AM", "crowdIndex":0,"waitMinutes":0,"level":"low"}},
    {{"hour":"09:00 AM","label":"9 AM", "crowdIndex":0,"waitMinutes":0,"level":"low"}},
    {{"hour":"10:00 AM","label":"10 AM","crowdIndex":0,"waitMinutes":0,"level":"low"}},
    {{"hour":"11:00 AM","label":"11 AM","crowdIndex":0,"waitMinutes":0,"level":"low"}},
    {{"hour":"12:00 PM","label":"12 PM","crowdIndex":0,"waitMinutes":0,"level":"low"}},
    {{"hour":"01:00 PM","label":"1 PM", "crowdIndex":0,"waitMinutes":0,"level":"low"}},
    {{"hour":"02:00 PM","label":"2 PM", "crowdIndex":0,"waitMinutes":0,"level":"low"}},
    {{"hour":"03:00 PM","label":"3 PM", "crowdIndex":0,"waitMinutes":0,"level":"low"}},
    {{"hour":"04:00 PM","label":"4 PM", "crowdIndex":0,"waitMinutes":0,"level":"low"}},
    {{"hour":"05:00 PM","label":"5 PM", "crowdIndex":0,"waitMinutes":0,"level":"low"}}
  ],
  "tip": "",
  "basedOn": ""
}}"""

    try:
        result = call_gemini(prompt)
        cache_set("best_time_cache", cache_key, result)
        return result
    except (json.JSONDecodeError, ValueError, IndexError, KeyError) as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message="Failed to generate timing data.",
        ) from e

@https_fn.on_call(region="asia-south1", max_instances=10)
def get_voter_trends(req: https_fn.CallableRequest) -> dict:
    enforce_rate_limit(req, "voterTrends")

    data          = req.data or {}
    state         = data.get("state", "").strip()
    election_type = data.get("electionType", "").strip()
    require(data, "state", "electionType")

    cache_key = f"vt_{state}_{election_type}".replace(" ", "_").lower()
    cached    = cache_get("voter_trends_cache", cache_key, 86_400_000 * 30)
    if cached:
        return cached

    election_label = "Lok Sabha (General)" if election_type == "lok_sabha" else "Vidhan Sabha (State)"

    prompt = f"""You are an expert on ECI voter roll data and Indian electoral history.

Provide registered voter data for {state} across all {election_label} elections since 1999.
Use real ECI data where known; estimate from population trends where unavailable.

Return ONLY this JSON:
{{
  "state": "{state}",
  "electionType": "{election_type}",
  "latestYear": 0,
  "previousYear": 0,
  "snapshots": [
    {{
      "year": 0,
      "totalRegistered": 0,
      "newVoters": 0,
      "deletedEntries": 0,
      "netChange": 0,
      "percentageChange": 0,
      "turnoutPercent": 0
    }}
  ],
  "summary": "",
  "source": "Data derived from Election Commission of India records and published electoral rolls."
}}"""

    try:
        result = call_gemini(prompt)
        cache_set("voter_trends_cache", cache_key, result)
        return result
    except (json.JSONDecodeError, ValueError, IndexError, KeyError) as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message="Failed to retrieve voter trend data.",
        ) from e
