# HerbalClinic - Setup Guide for Windows

Follow these steps to run the app on your laptop emulator without a physical phone.

## 1. Install Java (JDK 17)
React Native 0.76+ requires JDK 17.
1.  **Download**: [Adoptium Temurin 17 (MSI Installer)](https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.10_7.msi)
2.  **Install**: Run the downloaded `.msi` file.
3.  **Verification**: Open a **new** PowerShell window and type:
    ```powershell
    java -version
    ```

## 2. Install Android Studio
This is required to run the virtual phone (emulator).
1.  **Download**: [Android Studio](https://developer.android.com/studio)
2.  **Install**: Follow the wizard. Ensure **Android Virtual Device** is checked.
3.  **Setup Emulator**:
    *   Open Android Studio.
    *   Click **More Actions** > **Virtual Device Manager**.
    *   Click **Create Device**.
    *   Select **Pixel 6** (or similar) > Next.
    *   Download a System Image (e.g., **API 34**) > Next > Finish.
    *   Click the **Play button ▶️** to start the phone screen on your laptop.

## 3. Set Environment Variables
React Native needs to know where your tools are. Copy and paste these commands into your **PowerShell** (as Administrator if possible) to set them temporarily, or follow the manual steps below.

### Manual Steps:
1.  Search for **"Edit the system environment variables"** in Windows search.
2.  Click **Environment Variables**.
3.  Under **System Variables**, click **New**:
    *   Variable: `JAVA_HOME`
    *   Value: `C:\Program Files\Eclipse Adoptium\jdk-17.0.10.7-hotspot` (or your actual path)
4.  Click **New** again:
    *   Variable: `ANDROID_HOME`
    *   Value: `%LOCALAPPDATA%\Android\Sdk`
5.  Find the **Path** variable, click **Edit**, then **New** to add:
    *   `%LOCALAPPDATA%\Android\Sdk\platform-tools`
    *   `%LOCALAPPDATA%\Android\Sdk\emulator`

## 4. Run the App
Once the Emulator is running and Java is installed:

1.  Open your project terminal.
2.  Start Metro:
    ```bash
    npm start
    ```
3.  Start Android:
    ```bash
    npm run android
    ```

---

### Troubleshooting
Run this command to see what is still missing:
```bash
npx react-native doctor
```
If it shows red `❌`, press `f` to let it try and fix them for you automatically.
