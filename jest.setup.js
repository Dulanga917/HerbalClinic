jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: View,
    GestureHandlerRootView: ({ children }) => React.createElement(View, null, children),
    Swipeable: View,
    DrawerLayout: View,
    State: {
      ACTIVE: 'ACTIVE',
      END: 'END',
      START: 'START',
    },
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    ScrollViewGestureHandler: View,
    Directions: {},
  };
});

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');

  return ({ children, ...props }) => React.createElement(View, props, children);
});

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  readFile: jest.fn(),
  exists: jest.fn(async () => false),
  writeFile: jest.fn(async () => {}),
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
  setGenericPassword: jest.fn(async () => true),
  getGenericPassword: jest.fn(async () => false),
  resetGenericPassword: jest.fn(async () => true),
}));

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
    },
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    LIMITED: 'limited',
    UNAVAILABLE: 'unavailable',
  },
  check: jest.fn(async () => 'granted'),
  request: jest.fn(async () => 'granted'),
}));

jest.mock('@bam.tech/react-native-image-resizer', () => ({
  __esModule: true,
  default: {
    createResizedImage: jest.fn(),
  },
}));

jest.mock('react-native-fast-tflite', () => ({
  loadTensorflowModel: jest.fn(),
}));

jest.mock('@react-native-ml-kit/face-detection', () => ({
  __esModule: true,
  default: {
    detect: jest.fn(async () => [{ frame: { width: 400, height: 400, top: 100, left: 100 } }]),
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
