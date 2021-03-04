import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { localeStrings } from 'src/locales/strings';
import { userTypes } from '../../users/models/users.enum';

export class RegistrationUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: localeStrings.en.PASSWORD_TOO_WEAK,
  })
  password: string;

  salt?: string;

  // @IsOptional()
  // @IsIn([userTypes.ADMIN, userTypes.USER])
  // type: userTypes;
}
