package com.listdo.app;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.content.Context;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.JavascriptInterface;
import android.view.Window;

public class MainActivity extends Activity {
    private WebView webView;

    public class WebAppInterface {
        Context mContext;
        Vibrator mVibrator;

        WebAppInterface(Context c) {
            mContext = c;
            try {
                mVibrator = (Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
            } catch (Exception e) {}
        }

        @JavascriptInterface
        public void vibrate(long ms) {
            try {
                if (mVibrator != null && mVibrator.hasVibrator()) {
                    long duration = Math.max(35, ms);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        mVibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        mVibrator.vibrate(duration);
                    }
                }
            } catch (Exception e) {}
        }
    }

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

        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidApp");
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