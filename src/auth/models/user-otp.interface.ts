import { GeneratedSecret } from 'speakeasy';
import { userTypes } from '../../users/models/users.enum';

export interface IUserOtp {
  id: string;
  username: string;
  email: string;
  salt: string;
  password: string;
  date: Date;
  otp?: string;
  tmp_secret: GeneratedSecret;
  // type: userTypes;
}
