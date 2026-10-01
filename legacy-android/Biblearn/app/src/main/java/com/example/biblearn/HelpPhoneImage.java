package com.example.biblearn;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

public class HelpPhoneImage extends AppCompatActivity implements View.OnClickListener{
    Button goBack;
    Button logoB;
    Button BH1,BH2;
    TextView ConT1,ConT2;

    boolean help1=false;
    boolean help2=false;

    AirplaneModeChangeReceiver airplaneModeChangeReceiver = new AirplaneModeChangeReceiver();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_help_phone_image);
        this.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT); // אי אפשר לשנות את כיוון המסך

        goBack = findViewById(R.id.go_Back);
        logoB = findViewById(R.id.logoB);
        BH1=findViewById(R.id.BH1);
        BH2=findViewById(R.id.BH2);
        ConT1=findViewById(R.id.ConT1);
        ConT2=findViewById(R.id.ConT2);

        goBack.setOnClickListener(this);
        logoB.setOnClickListener(this);
        BH1.setOnClickListener(this);
        BH2.setOnClickListener(this);

    }

    @Override
    public void onClick(View v) { // פועל מתי שלוחצים על משהו שנתנו לו מקודם את הפקודה - setOnClickListener
        if (v == goBack)
        {

            Intent i = new Intent(this, HomeScreen.class);
            startActivity(i);
        }
        if (v == logoB)
        {
            Intent back = new Intent(this, HomeScreen.class);
            startActivity(back);
        }
        if (v==BH1 && help1 == false)
        {
           ConT1.setVisibility(View.VISIBLE);
           help1=true;
        }
        else if (v==BH1 && help1)
        {
            ConT1.setVisibility(View.GONE);
            help1=false;
        }
        if (v==BH2 && help2==false)
        {
            ConT2.setVisibility(View.VISIBLE);
            help2=true;
        }
        else if (v==BH2 && help2)
        {
            ConT2.setVisibility(View.GONE);
            help2=false;
        }
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
}