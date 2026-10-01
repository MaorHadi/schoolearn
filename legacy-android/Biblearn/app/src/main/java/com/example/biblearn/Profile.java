package com.example.biblearn;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.telephony.SmsManager;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import java.util.Locale;

public class Profile extends AppCompatActivity implements View.OnClickListener {
    private EditText editPhone2;
    private Button saveNumber;
    private TextToSpeech TTS;
    private SeekBar SeekBarPitch;
    private SeekBar SeekBarSpeed;
    private Button ButtonSpeak;
    private Button GoBack;
    private Button logoB;
    boolean allowBack = false;

    SharedPreferences sp;

    AirplaneModeChangeReceiver airplaneModeChangeReceiver = new AirplaneModeChangeReceiver();

    String phone;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);
        this.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        Toast.makeText(this, "האפליקציה תשתמש במספר רק אם תרצה לשלוח ב - sms למספר הזה את תוצאות המבחן שלך בסוף המבחן", Toast.LENGTH_LONG).show();

        ButtonSpeak = findViewById(R.id.button_speak);

        TTS = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if(status ==TextToSpeech.SUCCESS)
                {
                    int result = TTS.setLanguage(Locale.ENGLISH);
                    if(result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED)
                    {
                        Log.e("mTTS", "Language not supported");
                    }
                    else
                    {
                        ButtonSpeak.setEnabled(true);
                    }
                }
                else
                {
                    Log.e("mTTS", "Initialization failed");
                }

            }
        });


        sp = getApplicationContext().getSharedPreferences("UserPhone", Context.MODE_PRIVATE);
        phone = sp.getString("phoneNumberSave", "");


        editPhone2 = findViewById(R.id.editPhone2);
        saveNumber = findViewById(R.id.save);
        GoBack = findViewById(R.id.go_Back);
        logoB = findViewById(R.id.logoB);

        if(phone.isEmpty())
        {
            editPhone2.setHint("איש קשר או מספר");
        }
        else if (!phone.isEmpty())
        {
            editPhone2.setHint(phone);
        }

        SeekBarPitch = findViewById(R.id.seek_bar_pitch);
        SeekBarSpeed = findViewById(R.id.seek_bar_speed);

        saveNumber.setOnClickListener(this);

        GoBack.setOnClickListener(this);
        logoB.setOnClickListener(this);

        ButtonSpeak.setOnClickListener(this);
    }

    @Override
    protected void onStart() {
        super.onStart();
        IntentFilter filter = new IntentFilter(Intent.ACTION_AIRPLANE_MODE_CHANGED);
        registerReceiver(airplaneModeChangeReceiver, filter);
    }

    @Override
    protected void onStop() {
        super.onStop();
        unregisterReceiver(airplaneModeChangeReceiver);
    }

    @Override
    public void onClick(View v) { // פועל מתי שלוחצים על משהו שנתנו לו מקודם את הפקודה - setOnClickListener
        if(v==saveNumber)
        {
            SharedPreferences.Editor editor= sp.edit();
            editor.putString("phoneNumberSave" , editPhone2.getText().toString()).apply();
            Intent H_P = new Intent(this, HomeScreen.class);
            startActivity(H_P);

        }
        if(v== ButtonSpeak)
        {
            speakPhoneNumber();
        }
        if(v== GoBack)
        {
            Intent back = new Intent(this, HomeScreen.class);
            startActivity(back);
        }
        if (v == logoB)
        {
            Intent back = new Intent(this, HomeScreen.class);
            startActivity(back);
        }
    }



    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

    }

    private void speakPhoneNumber()
    {
        String number2 = TextToSpeechN(phone);
        Float pitch = (float) SeekBarPitch.getProgress() / 50;
        if(pitch<0.1) pitch = 0.1f;
        Float speed = (float) SeekBarSpeed.getProgress() / 50;
        if(speed<0.1) speed = 0.1f;

        TTS.setPitch(pitch);
        TTS.setSpeechRate(speed);

        TTS.speak(number2, TextToSpeech.QUEUE_FLUSH, null);

    }

    @Override
    protected void onDestroy() {
        if(TTS != null)
        {
            TTS.stop();
            TTS.shutdown();
        }

        super.onDestroy();
    }

    public static String TextToSpeechN (String number1)
    {
        String number2 = "";
        int C = 0;
        int NOL = (number1.length() * 2)-1; // אורך המוצר הסופי - number2
        for(int i = 0; i<NOL; i++)
        {
            if(i%2==0)
            {
                number2 = number2 + number1.charAt(C);
                C++;
            }
            else
            {
                number2 = number2 + " ";
            }
        }
        return number2;
    }
    @Override
    public void onBackPressed() {
        if (allowBack) {
            super.onBackPressed();
        } else {

        }
    }
}