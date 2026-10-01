package com.example.biblearn;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.ProgressBar;

public class HomeScreen extends AppCompatActivity implements View.OnClickListener{
    Button MS1;
    Button MS2;
    Button MS3;
    Button MS5;
    Button help_phone;
    ProgressBar loadScreenCheck;
    boolean allowBack = false;

    AirplaneModeChangeReceiver airplaneModeChangeReceiver = new AirplaneModeChangeReceiver();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_home_screen);
        this.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT); // אי אפשר לשנות את כיוון המסך

        MS1 = findViewById(R.id.B_MS1);
        MS2 = findViewById(R.id.B_MS2);
        MS3 = findViewById(R.id.B_MS3);
        MS5 = findViewById(R.id.B_MS5);
        help_phone = findViewById(R.id.help_button);

        loadScreenCheck = findViewById(R.id.loadScreenBar);




        MS1.setOnClickListener(this);
        MS2.setOnClickListener(this);
        MS3.setOnClickListener(this);
        MS5.setOnClickListener(this);
        help_phone.setOnClickListener(this);

        loadScreenCheck.setOnClickListener(this);



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
    public void onClick(View v) // פועל מתי שלוחצים על משהו שנתנו לו מקודם את הפקודה - setOnClickListener
    {
        if(v==MS1)
        {
            openactivit2();
        }
        if(v==MS2)
        {
            loadScreenCheck.setVisibility(View.VISIBLE);
            optionsTestActivity();
        }
        if(v==MS3)
        {
            ProfileActivity();
        }
        if(v==MS5)
        {
            FullChaptersActivity();
        }
        if(v==help_phone)
        {
            Help();
        }


    }


    @Override
    public void onBackPressed() {
        if (allowBack) {
            super.onBackPressed();
        } else {

        }
    }


    public void openactivit2()
    {
        Intent Schapters = new Intent (this, Schapters.class);
        startActivity(Schapters);
    }
    public void optionsTestActivity()
    {
        Intent test = new Intent (this, test.class);
        startActivity(test);
    }
    public void ProfileActivity()
    {
        Intent Profile = new Intent (this, Profile.class);
        startActivity(Profile);
    }

    public void FullChaptersActivity()
    {
        Intent Fchapters = new Intent(this, Fchapters.class);
        startActivity(Fchapters);
    }
    public void Help()
    {
        Intent help1 = new Intent(this, HelpPhoneImage.class);
        startActivity(help1);
    }
}