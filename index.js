import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds=10;
env.config();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.get("/", (req, res) => {
    //Step 1 - Make the get route work and render the index.ejs file.
    res.render("login.ejs");
});
app.get("/notification",(req,res)=>{
    res.render("notification.ejs");

})
app.get("/about",(req,res)=>{
    res.render("about.ejs");
    
})
app.get("/register",(req,res)=>{
    res.render("registration.ejs");
    
})
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
app.post("/login",(req,res)=>{
    const name=req.body.student_name;
    const email=req.body.email;
    const id=req.body.id;
    const enroll=req.body.enroll_no;
    const contact=req.body.contact_no;
    const password=req.body.password;
    

})
  