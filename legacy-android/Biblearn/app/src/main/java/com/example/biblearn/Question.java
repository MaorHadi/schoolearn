package com.example.biblearn;
import android.content.Intent;

import com.google.firebase.database.IgnoreExtraProperties;

@IgnoreExtraProperties
public class Question {
        public String question;
        public String options;
        public int answer;

        public Question() {
            // Default constructor required for calls to DataSnapshot.getValue(User.class)
        }

        public Question(String question, String options, int answer) {
            this.question = question;
            this.options = options;
            this.answer = answer;
        }

}
