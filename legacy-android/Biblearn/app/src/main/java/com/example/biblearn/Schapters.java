package com.example.biblearn;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;

public class Schapters extends AppCompatActivity implements View.OnClickListener{

    private Button GoBack;
    private Button logoB;
    private Button ch_1f;
    private Button ch_2f;
    private Button ch_3f;
    private Button ch_4f;
    private Button ch_5f;
    private Button ch_6f;
    private Button ch_7f;
    private Button ch_8f;
    private Button ch_9f;
    private Button ch_10f;
    private Button ch_11f;
    private Button ch_12f;
    private Button ch_13f;

    AirplaneModeChangeReceiver airplaneModeChangeReceiver = new AirplaneModeChangeReceiver();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_schapters);
        this.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        GoBack = findViewById(R.id.go_Back);
        logoB = findViewById(R.id.logoB);
        ch_1f = findViewById(R.id.ch_1);
        ch_2f = findViewById(R.id.ch_2);
        ch_3f = findViewById(R.id.ch_3);
        ch_4f = findViewById(R.id.ch_4);
        ch_5f = findViewById(R.id.ch_5);
        ch_6f = findViewById(R.id.ch_6);
        ch_7f = findViewById(R.id.ch_7);
        ch_8f = findViewById(R.id.ch_8);
        ch_9f = findViewById(R.id.ch_9);
        ch_10f = findViewById(R.id.ch_10);
        ch_11f = findViewById(R.id.ch_11);
        ch_12f = findViewById(R.id.ch_12);
        ch_13f = findViewById(R.id.ch_13);


        GoBack.setOnClickListener(this);
        logoB.setOnClickListener(this);
        ch_1f.setOnClickListener(this);
        ch_2f.setOnClickListener(this);
        ch_3f.setOnClickListener(this);
        ch_4f.setOnClickListener(this);
        ch_5f.setOnClickListener(this);
        ch_6f.setOnClickListener(this);
        ch_7f.setOnClickListener(this);
        ch_8f.setOnClickListener(this);
        ch_9f.setOnClickListener(this);
        ch_10f.setOnClickListener(this);
        ch_11f.setOnClickListener(this);
        ch_12f.setOnClickListener(this);
        ch_13f.setOnClickListener(this);


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
        if(v==GoBack)
        {
            Intent back = new Intent(this, HomeScreen.class);
            startActivity(back);
        }
        if (v == logoB)
        {
            Intent j = new Intent(this, HomeScreen.class);
            startActivity(j);
        }
        if (v==ch_1f)
        {
            String url = "https://drive.google.com/drive/folders/1z1IBOFNM5H1xoDwUk2svYFBDbob2UaMN?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_2f)
        {
            String url = "https://drive.google.com/drive/folders/1U45Drz_ztu4MuU6W7gO7Wm_C50HSMxgc?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_3f)
        {
            String url = "https://drive.google.com/drive/folders/1w746Ravt0BsqiGk67_z8CUryzlNkbonv?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_4f)
        {
            String url = "https://drive.google.com/drive/folders/1TohTWkQKxGOgyP38L3fGX7Xr_YuxkcTr?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_5f)
        {
            String url = "https://drive.google.com/drive/folders/1v1XUKck0sh4oQ7JfDl_tnsLMg3CtqQZv?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_6f)
        {
            String url = "https://drive.google.com/drive/folders/1JftZw0ynDf_6uoDW3dDSmI-nuQvHLuXD?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_7f)
        {
            String url = "https://drive.google.com/drive/folders/1lvqxQnvHHZDf_1kFqP4GeVlayGez75il?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_8f)
        {
            String url = "https://drive.google.com/drive/folders/1TxzcKkezImdWJMPC7LYcJAxcvQpONF38?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_9f)
        {
            String url = "https://drive.google.com/drive/folders/1xLfOTRzGVv_oeThP8PK5f2AMubkMJV20?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_10f)
        {
            String url = "https://drive.google.com/drive/folders/1rH2HHCcBerITSsHxKsz4fRi9gd0aTSd6?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_11f)
        {
            String url = "https://drive.google.com/drive/folders/1lFqPOyio75SXNm5bYhmdCGMXP8ztIx-w?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_12f)
        {
            String url = "https://drive.google.com/drive/folders/1k8hj3AxoTyRM0JpJvBmT3Rqc163EOUln?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }
        if (v==ch_13f)
        {
            String url = "https://drive.google.com/drive/folders/12mCtyiX-TZmOtqYKKbNIGOP66vNy9jl_?usp=sharing";
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setData(Uri.parse(url));
            startActivity(i);
        }


    }
}