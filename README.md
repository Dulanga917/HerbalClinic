This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Step 1: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the _root_ of your React Native project:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from the _root_ of your React Native project. Run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see your new app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.

## Step 3: Modifying your App

Now that you have successfully run the app, let's modify it.

1. Open `App.tsx` in your text editor of choice and edit some lines.
2. For **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Developer Menu** (<kbd>Ctrl</kbd> + <kbd>M</kbd> (on Window and Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (on macOS)) to see your changes!

   For **iOS**: Hit <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> in your iOS Simulator to reload the app and see your changes!

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

## Gemini skin analysis setup

Skin-issue analysis must go through the local HerbalClinic API so the Gemini key never ships in the mobile app.

1. Copy `.env.example` to `.env` in the project root (or `server/.env`).
2. Put a **new** Gemini API key in `GEMINI_API_KEY`. The previous key that lived in app source must be treated as compromised and revoked.
3. Install and start the API:

```powershell
cd server
npm install
npm start
```

4. Keep the API running, then start the Android app. The emulator reaches the host machine at `http://10.0.2.2:3001`.

Do not put the Gemini key in `src/constants/config.ts`, Git, logs, or the mobile binary. For a production deployment, terminate TLS in front of the API and keep the key only on the server.

## Release builds (HTTPS and signing)

**API address.** Debug builds use the local HTTP API. Release builds ignore that and only accept an `https://` URL. Set `PRODUCTION_API_BASE_URL` in `src/constants/config.ts` to your public API address (not a secret). If it is empty or not HTTPS, the release app refuses to call the API instead of falling back to HTTP. The release Android build also blocks cleartext traffic through `network_security_config.xml`; only debug builds allow it.

**Signing.** Release builds are never signed with the debug keystore. Provide your own upload/release keystore outside the repository and pass these values as Gradle properties (for example in `~/.gradle/gradle.properties`) or environment variables:

```
HERBALCLINIC_RELEASE_STORE_FILE
HERBALCLINIC_RELEASE_STORE_PASSWORD
HERBALCLINIC_RELEASE_KEY_ALIAS
HERBALCLINIC_RELEASE_KEY_PASSWORD
```

Without them `assembleRelease` / `bundleRelease` stop with an explanatory error. `*.keystore` and `*.jks` files are gitignored.

**Production API.** Run the API behind a TLS-terminating proxy with `NODE_ENV=production`, `TRUST_PROXY=<hops>` and `CORS_ALLOWED_ORIGINS` set only if a browser client needs access. In production the API rejects non-HTTPS requests (except `/health`), applies security headers, limits login/registration/Gemini request rates, and validates all scan and upload input. See `server/.env.example`.

## Authentication and local data

Accounts are stored in the API SQLite database. Passwords are hashed with bcrypt and are never stored in plaintext. The app keeps only a session token in platform secure storage.

Optional development seeding is disabled by default. If you need a local test user, set `SEED_DEV_USER=true` plus `SEED_DEV_EMAIL` and `SEED_DEV_PASSWORD` in `.env`. Do not enable this in production.

## On-device dosha image classifier

The "Dosha Image Classifier" uses `src/assets/ayurvedic_model.tflite` and the output order in `src/assets/dosha-labels.json` (`Kapha`, `Pitta`, `Vata`). It runs locally on Android and does not require a Gemini API key.

The app resizes photos to 224 × 224 RGB and normalizes float values to 0–1 before inference. This preprocessing must match the model's training setup. The original training preprocessing and evaluation could not be verified, so treat predictions as experimental; they are not a medical diagnosis. The supplied dataset was small and had duplicates across splits, so do not treat its reported confidence as clinical reliability.

Changing the model or labels requires rebuilding the Android app:

```powershell
npx react-native run-android
```

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [Introduction to React Native](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you can't get this to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
