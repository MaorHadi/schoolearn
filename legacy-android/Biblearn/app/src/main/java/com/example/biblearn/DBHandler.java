package com.example.biblearn;

import android.content.Intent;

import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import java.util.ArrayList;

public class DBHandler extends Question{
    public ArrayList<Question> questionList = new ArrayList<Question>();

    private DatabaseReference mDatabase;

    public void readData(){

        mDatabase = FirebaseDatabase.getInstance().getReference();

        DatabaseReference rootRef = FirebaseDatabase.getInstance().getReference();
        DatabaseReference chatSpaceRef = rootRef.child("questionsDB");
        ValueEventListener eventListener = new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot dataSnapshot) {
                for(DataSnapshot ds : dataSnapshot.getChildren()) {
                    questionList.add(
                            new Question(ds.child("question").getValue().toString(),
                                    ds.child("options").getValue().toString(),
                                    Integer.parseInt(ds.child("answer").getValue().toString())));
                }
            }

            @Override
            public void onCancelled(DatabaseError databaseError) {



            }
        };
        chatSpaceRef.addListenerForSingleValueEvent(eventListener);


    }

    public ArrayList<Question> getQuestionList(){
        return questionList;
    }
}
