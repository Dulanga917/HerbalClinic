import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.herbalclinic.session';

export const saveSessionToken = async (token: string): Promise<void> => {
  await Keychain.setGenericPassword('session', token, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

export const getSessionToken = async (): Promise<string | null> => {
  const credentials = await Keychain.getGenericPassword({ service: SERVICE });
  if (!credentials) {
    return null;
  }
  return credentials.password;
};

export const clearSessionToken = async (): Promise<void> => {
  await Keychain.resetGenericPassword({ service: SERVICE });
};
