package com.example.biblearn;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;

public class Fchapters extends Schapters implements View.OnClickListener{

    private Button Go_Back;
    private Button logoB;

    private Button ch_1fc;
    private Button ch_2fc;
    private Button ch_3fc;
    private Button ch_4fc;
    private Button ch_5fc;
    private Button ch_6fc;
    private Button ch_7fc;
    private Button ch_8fc;
    private Button ch_9fc;
    private Button ch_10fc;
    private Button ch_11fc;
    private Button ch_12fc;
    private Button ch_13fc;


    AirplaneModeChangeReceiver airplaneModeChangeReceiver = new AirplaneModeChangeReceiver();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_fchapters);
        this.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT); // אי אפשר לשנות את כיוון המסך

        Go_Back = findViewById(R.id.go_Back);
        logoB = findViewById(R.id.logoB);
        ch_1fc = findViewById(R.id.ch_1_fc);
        ch_2fc = findViewById(R.id.ch_2_fc);
        ch_3fc = findViewById(R.id.ch_3_fc);
        ch_4fc = findViewById(R.id.ch_4_fc);
        ch_5fc = findViewById(R.id.ch_5_fc);
        ch_6fc = findViewById(R.id.ch_6_fc);
        ch_7fc = findViewById(R.id.ch_7_fc);
        ch_8fc = findViewById(R.id.ch_8_fc);
        ch_9fc = findViewById(R.id.ch_9_fc);
        ch_10fc = findViewById(R.id.ch_10_fc);
        ch_11fc = findViewById(R.id.ch_11_fc);
        ch_12fc = findViewById(R.id.ch_12_fc);
        ch_13fc = findViewById(R.id.ch_13_fc);


        Go_Back.setOnClickListener(this);
        logoB.setOnClickListener(this);
        ch_1fc.setOnClickListener(this);
        ch_2fc.setOnClickListener(this);
        ch_3fc.setOnClickListener(this);
        ch_4fc.setOnClickListener(this);
        ch_5fc.setOnClickListener(this);
        ch_6fc.setOnClickListener(this);
        ch_7fc.setOnClickListener(this);
        ch_8fc.setOnClickListener(this);
        ch_9fc.setOnClickListener(this);
        ch_10fc.setOnClickListener(this);
        ch_11fc.setOnClickListener(this);
        ch_12fc.setOnClickListener(this);
        ch_13fc.setOnClickListener(this);
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

        if(v==Go_Back)//חוזר למחלקה - HomeScreen
        {
            Intent back = new Intent(this, HomeScreen.class);
            startActivity(back);
        }
        if (v == logoB)
        {
            Intent j = new Intent(this, HomeScreen.class);
            startActivity(j);
        }
        if (v==ch_1fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0112.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_2fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0113.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_3fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0115.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_4fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0116.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_5fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0118.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_6fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0121.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_7fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0122.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_8fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0123.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_9fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0124.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_10fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0125.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_11fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0127.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_12fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0128.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_13fc) // שולח לאתר של הפרק המלא ב chrome
        {
            String url = "https://kodesh.snunit.k12.il/i/t/t0129.htm";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }

    }
}