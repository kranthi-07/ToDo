$ErrorActionPreference = "Stop"

$StudioJbr   = "C:\Program Files\Android\Android Studio\jbr"
$AndroidSdk  = "C:\Users\jagan\AppData\Local\Android\Sdk"
$BuildTools  = "$AndroidSdk\build-tools\36.0.0"
$PlatformJar = "$AndroidSdk\platforms\android-36\android.jar"

$Javac     = "$StudioJbr\bin\javac.exe"
$Jar       = "$StudioJbr\bin\jar.exe"
$Keytool   = "$StudioJbr\bin\keytool.exe"
$Aapt2     = "$BuildTools\aapt2.exe"
$D8        = "$BuildTools\d8.bat"
$Zipalign  = "$BuildTools\zipalign.exe"
$Apksigner = "$BuildTools\apksigner.bat"

$env:JAVA_HOME = $StudioJbr
$env:PATH = "$StudioJbr\bin;" + $env:PATH

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$BuildDir = "$PSScriptRoot\android-build"
if (Test-Path $BuildDir) { Remove-Item $BuildDir -Recurse -Force }
New-Item -ItemType Directory -Path "$BuildDir\res\values" -Force | Out-Null
New-Item -ItemType Directory -Path "$BuildDir\res\mipmap-xxhdpi" -Force | Out-Null
New-Item -ItemType Directory -Path "$BuildDir\res\mipmap-xxxhdpi" -Force | Out-Null
New-Item -ItemType Directory -Path "$BuildDir\assets" -Force | Out-Null
New-Item -ItemType Directory -Path "$BuildDir\src\com\listdo\app" -Force | Out-Null
New-Item -ItemType Directory -Path "$BuildDir\gen" -Force | Out-Null
New-Item -ItemType Directory -Path "$BuildDir\bin\classes" -Force | Out-Null
New-Item -ItemType Directory -Path "$BuildDir\bin\dex" -Force | Out-Null

# 1. Assets
Copy-Item "$PSScriptRoot\index.html" "$BuildDir\assets\"
Copy-Item "$PSScriptRoot\style.css"  "$BuildDir\assets\"
Copy-Item "$PSScriptRoot\app.js"     "$BuildDir\assets\"
Copy-Item "$PSScriptRoot\manifest.json" "$BuildDir\assets\"
Copy-Item "$PSScriptRoot\icon.svg"   "$BuildDir\assets\"
Copy-Item "$PSScriptRoot\icon-192.png" "$BuildDir\assets\"
Copy-Item "$PSScriptRoot\icon-512.png" "$BuildDir\assets\"

# Icons
Copy-Item "$PSScriptRoot\icon-192.png" "$BuildDir\res\mipmap-xxhdpi\ic_launcher.png"
Copy-Item "$PSScriptRoot\icon-512.png" "$BuildDir\res\mipmap-xxxhdpi\ic_launcher.png"

# Strings
$stringsXml = @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">List Do</string>
</resources>
"@
[System.IO.File]::WriteAllText("$BuildDir\res\values\strings.xml", $stringsXml, $utf8NoBom)

# Manifest
$manifestXml = @"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.listdo.app"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher"
        android:theme="@android:style/Theme.NoTitleBar"
        android:allowBackup="true"
        android:supportsRtl="true"
        android:hardwareAccelerated="true">

        <activity
            android:name="com.listdo.app.MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
"@
[System.IO.File]::WriteAllText("$BuildDir\AndroidManifest.xml", $manifestXml, $utf8NoBom)

# Java source
$javaCode = @"
package com.listdo.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.Window;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
"@
[System.IO.File]::WriteAllText("$BuildDir\src\com\listdo\app\MainActivity.java", $javaCode, $utf8NoBom)

Write-Host "── Step 1: Compiling resources with aapt2 ──"
& $Aapt2 compile --dir "$BuildDir\res" -o "$BuildDir\compiled_res.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

Write-Host "── Step 2: Linking resources with aapt2 ──"
& $Aapt2 link -I $PlatformJar --manifest "$BuildDir\AndroidManifest.xml" -o "$BuildDir\unaligned.apk" "$BuildDir\compiled_res.zip" -A "$BuildDir\assets" --java "$BuildDir\gen"
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

Write-Host "── Step 3: Compiling Java source code with javac ──"
$javaFiles = Get-ChildItem "$BuildDir\src\*.java" -Recurse | Select-Object -ExpandProperty FullName
$genFiles = Get-ChildItem "$BuildDir\gen\*.java" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
$allJava = @($javaFiles) + @($genFiles)
& $Javac -source 11 -target 11 -cp "$PlatformJar" -d "$BuildDir\bin\classes" $allJava
if ($LASTEXITCODE -ne 0) { throw "javac failed" }

Write-Host "── Step 4: Converting bytecode with d8 ──"
$classFiles = Get-ChildItem "$BuildDir\bin\classes\com\listdo\app\*.class" | Select-Object -ExpandProperty FullName
& cmd.exe /c "`"$D8`" --lib `"$PlatformJar`" --output `"$BuildDir\bin\dex`" $($classFiles -join ' ')"
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

Write-Host "── Step 5: Adding classes.dex into APK ──"
Push-Location "$BuildDir\bin\dex"
& $Jar uf "$BuildDir\unaligned.apk" "classes.dex"
Pop-Location
if ($LASTEXITCODE -ne 0) { throw "jar uf failed" }

Write-Host "── Step 6: Generating debug keystore ──"
$keystore = "$BuildDir\debug.keystore"
& $Keytool -genkeypair -v -keystore $keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
if ($LASTEXITCODE -ne 0) { throw "keytool failed" }

Write-Host "── Step 7: Zipalign APK ──"
$alignedApk = "$BuildDir\ListDo-aligned.apk"
& $Zipalign -f -p 4 "$BuildDir\unaligned.apk" $alignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

Write-Host "── Step 8: Signing APK with apksigner ──"
$finalApk = "$PSScriptRoot\ListDo.apk"
& cmd.exe /c "`"$Apksigner`" sign --ks `"$keystore`" --ks-pass pass:android --key-pass pass:android --out `"$finalApk`" `"$alignedApk`""
if ($LASTEXITCODE -ne 0) { throw "apksigner sign failed" }

Write-Host "── Step 9: Verifying signed APK ──"
& cmd.exe /c "`"$Apksigner`" verify `"$finalApk`""

$apkInfo = Get-Item $finalApk
Write-Host "SUCCESS! Production-ready APK created: $finalApk ($([math]::Round($apkInfo.Length / 1MB, 2)) MB)"
