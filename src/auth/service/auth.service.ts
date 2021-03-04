import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RegistrationUserDto } from '../dto/registration-user.dto';
import { User } from 'src/users/models/user.entity';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { JsonDB } from 'node-json-db';
import { Config as JsonConfig } from 'node-json-db/dist/lib/JsonDBConfig';
import { IUserOtp } from '../models/user-otp.interface';
import { localeStrings } from 'src/locales/strings';
import { RegistrationOtpDto } from '../dto/registration-otp.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { jwtPayload } from '../models/jwt-payload.interface';
import * as config from 'config';
import * as speakeasy from 'speakeasy';
import * as uuid from 'uuid';
import * as bcrypt from 'bcrypt';
import { userStatus, userTypes } from 'src/users/models/users.enum';

const nodeDB = new JsonDB(new JsonConfig('user-otp', true, false, '/'));

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async signUp(registrationUserDto: RegistrationUserDto): Promise<any> {
    const { username, email, password } = registrationUserDto;

    let userByUsername = await this.userRepository.findOne({ username });
    let userByEmail = await this.userRepository.findOne({ email });

    if (userByUsername || userByEmail) {
      if (userByUsername) {
        throw new ConflictException(localeStrings.en.USERNAME_ALREADY_EXITS);
      }
      if (userByEmail) {
        throw new ConflictException(localeStrings.en.EMAIL_ALREADY_TAKEN);
      }
    }

    let user: IUserOtp = null;
    let users: IUserOtp[] = [];
    let currentDate: Date = new Date(Date.now());
    currentDate.setMinutes(currentDate.getMinutes() - 10);
    let sendEmail: boolean = false;

    try {
      users = Object.values(nodeDB.getData('/users/'));
    } catch (err) {
      console.log('err: ', JSON.stringify(err));
      throw new InternalServerErrorException();
    }

    user = users.find((e) => e.username === username);

    if (!user) {
      user = {
        id: uuid.v4(),
        date: new Date(Date.now()),
        username,
        email,
        password,
        salt: '',
        tmp_secret: null,
      };

      user.tmp_secret = speakeasy.generateSecret();
      user.otp = speakeasy.totp({
        secret: user.tmp_secret.base32,
        encoding: 'base32',
        algorithm: 'sha256',
        step: 2 * 60,
      });
      user.salt = await bcrypt.genSalt();
      user.password = await bcrypt.hash(password, user.salt);
      users.push(user);
      sendEmail = true;
    } else {
      let otp = speakeasy.totp({
        secret: user.tmp_secret.base32,
        encoding: 'base32',
        algorithm: 'sha256',
        step: 2 * 60,
      });

      if (user.otp !== otp) {
        user.otp = otp;
        user.date = new Date(Date.now());
        sendEmail = true;
      }
    }

    if (sendEmail) {
      try {
        await this.mailerService.sendMail({
          to: email,
          from: config.get('smtp.gmail'),
          subject: 'From flix go ✔',
          html: `<b>${user.otp}</b>`,
        });
      } catch (err) {
        console.log('Error!: ', JSON.stringify(err));
        throw new InternalServerErrorException();
      }
    }

    users = users.filter((e) => new Date(e.date) > currentDate);

    try {
      nodeDB.push('/users/', users);
    } catch (err) {
      console.log('err: ', JSON.stringify(err));
      throw new InternalServerErrorException();
    }

    return {
      message: localeStrings.en.SENT_OTP_TO_EMAIL,
      otp_id: user.id,
    };
  }

  async signUpOtp(registrationOtpDto: RegistrationOtpDto): Promise<any> {
    const { otp, otp_id } = registrationOtpDto;

    let users: IUserOtp[] = [];
    let user: IUserOtp = null;

    try {
      users = Object.values(nodeDB.getData('/users/'));
    } catch (err) {
      console.log('err: ', JSON.stringify(err));
      throw new InternalServerErrorException();
    }

    user = users.find((e) => e.id === otp_id);

    if (!user) {
      throw new NotFoundException();
    }

    const {
      id,
      username,
      email,
      password,
      salt,
      tmp_secret: { base32 },
    } = user;

    let tmpOtp = speakeasy.totp({
      secret: base32,
      encoding: 'base32',
      algorithm: 'sha256',
      step: 2 * 60,
    });

    let verified = tmpOtp === otp;

    if (verified) {
      users = users.filter((e) => e.id !== id);

      const isEmailAllowed = Object.values(
        config.get('allowedAdminEmails'),
      ).find((e) => e === email);

      let newUser = new User();
      newUser.email = email;
      newUser.username = username;
      newUser.firstname = '';
      newUser.lastname = '';
      newUser.salt = salt;
      newUser.password = password;
      newUser.status = userStatus.APPROVED;
      newUser.type = isEmailAllowed ? userTypes.ADMIN : userTypes.USER;
      newUser.created_date = new Date(Date.now());

      await newUser.save();
    }

    try {
      nodeDB.push('/users/', users);
    } catch (err) {
      console.log('err: ', JSON.stringify(err));
      throw new InternalServerErrorException();
    }

    return { verified };
  }

  async signIn(loginUserDto: LoginUserDto): Promise<{ access_token; user }> {
    const { email, password } = loginUserDto;
    const user = await this.userRepository.findOne({ email });

    if (!(user && (await user.validatePassword(password)))) {
      throw new UnauthorizedException(localeStrings.en.INVALID_CREDENTIALS);
    }

    delete user.salt;
    delete user.password;

    const { id, username } = user;
    const payload: jwtPayload = { id, username, email };
    const access_token = await this.jwtService.sign(payload);

    return { access_token, user };
  }
}
