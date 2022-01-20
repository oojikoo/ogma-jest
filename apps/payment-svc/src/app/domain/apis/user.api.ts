import * as UserInfo from './user.info';

export interface UserApi {
  getUserInfo(userId: string): Promise<UserInfo.Simple>;
}
