package com.example.biblearn;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.Manifest;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.telephony.SmsManager;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;


public class test extends AppCompatActivity implements View.OnClickListener{

    TextView showQue;
    Button ansA, ansB, ansC, ansD;
    Button submit_btn;
    TextView Press1,Press2,Press3,Press4;
    boolean allowBack = false;
    boolean state = false;



    AirplaneModeChangeReceiver airplaneModeChangeReceiver = new AirplaneModeChangeReceiver();


    SharedPreferences sp;
    private String phone;

    int score = 0;
    int currentQuestion = 0;
    int selectedAns =-1;
    ArrayList<Question> questionArrayList;






    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_test);
        this.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);


        sp = getApplicationContext().getSharedPreferences("UserPhone", Context.MODE_PRIVATE);
        phone = sp.getString("phoneNumberSave", "");

        DBHandler db = new DBHandler();
        db.readData();
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        questionArrayList = db.questionList;

        showQue = findViewById(R.id.showQue);
        ansA = findViewById(R.id.ans_A);
        ansB = findViewById(R.id.ans_B);
        ansC = findViewById(R.id.ans_C);
        ansD = findViewById(R.id.ans_D);
        submit_btn = findViewById(R.id.submit_BTN);
        Press1 = findViewById(R.id.press1);
        Press2 = findViewById(R.id.press2);
        Press3 = findViewById(R.id.press3);
        Press4 = findViewById(R.id.press4);

        ansA.setOnClickListener(this);
        ansB.setOnClickListener(this);
        ansC.setOnClickListener(this);
        ansD.setOnClickListener(this);
        submit_btn.setOnClickListener(this);


        loadNewQue();

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
    public void onClick(View view) { // פועל מתי שלוחצים על משהו שנתנו לו מקודם את הפקודה - setOnClickListener
        Press1.setBackgroundColor(getColor(R.color.testdef));
        Press2.setBackgroundColor(getColor(R.color.testdef));
        Press3.setBackgroundColor(getColor(R.color.testdef));
        Press4.setBackgroundColor(getColor(R.color.testdef));



        Button clickedButton = (Button) view;
        if(clickedButton.getId() == R.id.submit_BTN)
        {
            /*if (selectedAns == questionArrayList.get(currentQuestion).answer + 1)
            {
                score++;
            }
            currentQuestion++;
            loadNewQue();*/

            if (selectedAns == questionArrayList.get(currentQuestion).answer + 1 && state)
            {
                submit_btn.setText("סיימתי");
                ansA.setClickable(true);
                ansB.setClickable(true);
                ansC.setClickable(true);
                ansD.setClickable(true);
                currentQuestion++;
                loadNewQue();
            }
            else if(selectedAns == questionArrayList.get(currentQuestion).answer + 1 && !state)
            {
                score++;
                ansA.setClickable(false);
                ansB.setClickable(false);
                ansC.setClickable(false);
                ansD.setClickable(false);
                submit_btn.setText("המשך");
                if(selectedAns == 1)
                {
                    Press1.setBackgroundColor(getColor(R.color.testR));
                }
                if(selectedAns == 2)
                {
                    Press2.setBackgroundColor(getColor(R.color.testR));
                }
                if(selectedAns == 3)
                {
                    Press3.setBackgroundColor(getColor(R.color.testR));
                }
                if(selectedAns == 4)
                {
                    Press4.setBackgroundColor(getColor(R.color.testR));
                }
                final MediaPlayer correct = MediaPlayer.create(this, R.raw.correct);
                correct.start();
                state = true;
            }
            else if (selectedAns != questionArrayList.get(currentQuestion).answer + 1 && state)
            {
                submit_btn.setText("סיימתי");
                ansA.setClickable(true);
                ansB.setClickable(true);
                ansC.setClickable(true);
                ansD.setClickable(true);
                currentQuestion++;
                loadNewQue();
            }
            else if(selectedAns != questionArrayList.get(currentQuestion).answer + 1 && !state)
            {
                ansA.setClickable(false);
                ansB.setClickable(false);
                ansC.setClickable(false);
                ansD.setClickable(false);
                submit_btn.setText("המשך");
                if(selectedAns == 1)
                {
                    Press1.setBackgroundColor(getColor(R.color.testW));
                }
                if(selectedAns == 2)
                {
                    Press2.setBackgroundColor(getColor(R.color.testW));
                }
                if(selectedAns == 3)
                {
                    Press3.setBackgroundColor(getColor(R.color.testW));
                }
                if(selectedAns == 4)
                {
                    Press4.setBackgroundColor(getColor(R.color.testW));
                }
                final MediaPlayer incorrect = MediaPlayer.create(this, R.raw.incorrect);
                incorrect.start();
                state = true;
            }
        }
        else
        {
            selectedAns = Integer.parseInt(clickedButton.getTag().toString()) ;
            if(selectedAns == 1)
            {
                Press1.setBackgroundColor(getColor(R.color.Background_mainA));
                state = false;
            }
            if(selectedAns == 2)
            {
                Press2.setBackgroundColor(getColor(R.color.Background_mainA));
                state = false;
            }
            if(selectedAns == 3)
            {
                Press3.setBackgroundColor(getColor(R.color.Background_mainA));
                state = false;
            }
            if(selectedAns == 4)
            {
                Press4.setBackgroundColor(getColor(R.color.Background_mainA));
                state = false;
            }
        }

    }

    void loadNewQue()
    {
        if(currentQuestion == questionArrayList.size())
        {
            endquiz();
            return;
        }
        showQue.setText(questionArrayList.get(currentQuestion).question);
        List<String> options = Arrays.asList(questionArrayList.get(currentQuestion).options.split(","));
        ansA.setText(options.get(0));
        ansB.setText(options.get(1));
        ansC.setText(options.get(2));
        ansD.setText(options.get(3));
    }
    void endquiz()
    {
        String Did_He_Pass = "";
        if(score> questionArrayList.size()*0.6)
        {
            Did_He_Pass = "אתה עברת, כל הכבוד";
        }
        else
        {
            Did_He_Pass = "אתה לא עברת, תנסה שוב פעם! ";
        }
        if(currentQuestion == 0)
        {
            new AlertDialog.Builder(test.this)
                    .setTitle("להתחיל")
                    .setCancelable(false)
                    .setPositiveButton("קדימה" , (dialogInterface, i) -> restartQuiz() )
                    .show();

        }
        else if(currentQuestion>0)
        {
           new AlertDialog.Builder(this)
                    .setTitle(Did_He_Pass)
                    .setCancelable(false)
                    .setMessage("your score is " + score + " out of " + questionArrayList.size())
                    .setPositiveButton("להתחיל מחדש", (dialogInterface, i) -> restartQuiz())
                    .setNegativeButton("סיימתי", new DialogInterface.OnClickListener() {
                                @Override
                                public void onClick(DialogInterface dialog, int which)
                                {
                                    goBack();
                                }
                            }
                    )
                    .setNeutralButton("שליחת תוצאה", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialogInterface, int i) {
                            sms_premission();
                        }
                    })
                    .show();
        }
    }

    void restartQuiz()
    {
        score =0;
        currentQuestion=0;
        loadNewQue();

    }
    void goBack()
    {
        Intent home = new Intent(this, HomeScreen.class);
        startActivity(home);

    }



    private void sms_premission()
    {
        // בדיקה הרשאה
        if(ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED)
        {
            // כשיש הרשאה
            SendMessage();
        }
        else
        {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.SEND_SMS} , 100);
        }
        Intent back = new Intent(this, HomeScreen.class);
        startActivity(back);
    }
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if(requestCode == 100 && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED)
        {
            // כשיש הרשאה
            SendMessage();
        }
        else
        {
            //nothing here
        }
    }

    private void SendMessage()
    {
        if(phone.equals("") == false)
        {
            // sms manager
            SmsManager smsManager = SmsManager.getDefault();
            // שליחת ההודעה
            smsManager.sendTextMessage(phone, null,"your score is " + score + " out of " + questionArrayList.size() ,null, null);
            Toast.makeText(this, "message sent, possible delay", Toast.LENGTH_LONG).show();
        }
        else
        {
            //nothing here:)
        }

    }

    @Override
    public void onBackPressed() {
        if (allowBack) {
            super.onBackPressed();
        } else {

        }
    }





}