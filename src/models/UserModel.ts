export default interface User {
  id:          string;
  name:        string;
  email:       string;
  photoURL:    string;
  createdAt:   Date;
  lastLogin:   Date;
  homeAddress: string;
  workAddress: string;
  birthday:    Date | null;
  gender:      string;
}
