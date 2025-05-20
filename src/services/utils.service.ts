import { Injectable } from '@nestjs/common';
import { promisify } from 'util';
import * as bcrypt from 'bcrypt';
import { Constants } from '../constants';

const hashAsync = promisify(bcrypt.hash);

@Injectable()
export class UtilsService {

  async createHash(password: string): Promise<string> {
    const passwordHash = await hashAsync(password, Constants.HashCostFactor);
    return passwordHash;
  }

}
