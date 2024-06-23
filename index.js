import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt, { hash } from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from 'cloudinary';

const app = express();
const port = 3000;
const saltRounds=10;
env.config();

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
    })
  );

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());


const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
db.connect();

const storage=multer.diskStorage({
    filename: function (req,file,cb){
        cb(null,file.originalname);

    } 
    
});
const upload=multer({storage:storage});

cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret
});
var curr_user;
var notification_item=[];

app.get("/", (req, res) => {
    //Step 1 - Make the get route work and render the index.ejs file.
    res.render("login.ejs");
});
app.get("/sell",(req,res)=>{
    res.render("sell.ejs",{
        length:notification_item.length
    });

})

app.get("/notification",async (req,res)=>{
   
    try {
        const notify= await countnotification();


        res.render("notification.ejs",{
            length:notify.length,
            notification:notify
        });
     
    } catch (error) {
        console.log(error);

    }


})
async function countnotification () {
    try {
        const result=await db.query("SELECT * FROM notifications INNER JOIN products ON product_id=prod_id INNER JOIN students ON students.id=customer_id WHERE seller_id=$1 ",[curr_user]);
        const notify=[];
        result.rows.forEach(element => {
            notify.push(element);
        });
        notification_item=notify;
        return  notify;
    } catch (error) {
        console.log(error);
    }
   
}
app.get("/about",(req,res)=>{
    res.render("about.ejs",{
        length:notification_item.length
    });
    
})
app.get("/login", (req, res) => {
    res.render("login.ejs");
});
app.get("/register",(req,res)=>{
    // const name=req.body.student_name;
    // const email=req.body.email;
    // const id=req.body.id;
    // const enroll=req.body.enroll_no;
    // const contact=req.body.contact_no;
    // const password=req.body.password;
    res.render("registration.ejs");
    
})
app.get("/logout",(req,res)=>{
    req.logout(function (err){
        if(err)
             return next(err);
        res.redirect("/");
    })
   
})
app.get("/index", async(req,res)=>{
   
    console.log(req.user);
    if(req.isAuthenticated()){
        const current_user_id=req.user.id;
        curr_user=req.user.id;
       
        try {
        const notify = await countnotification();
        const result=await db.query("SELECT * FROM products INNER JOIN students ON student_id=students.id");
        let prod=[];
        result.rows.forEach((p)=>{
            if(p.student_id!=current_user_id){
                prod.push(p);
            }
        })
     

        res.render("index.ejs",{
            products:prod,
            length:notify.length
          

        });

        } catch (error) {
            console.log(error);

        }
        
    }
    else{
        res.redirect("/login");
    }
})

app.get("/cart",async (req,res)=>{
    const id=curr_user;
    try {
        const result=await db.query("SELECT * FROM carts INNER JOIN products ON cart_product_id=prod_id WHERE cart_student_id=$1",[id]);
        const carts=[];
        result.rows.forEach(element => {
             carts.push(element);
        });
        res.render("cart.ejs",{
            carts:carts,
            length:notification_item.length,
            cart_len:carts.length
        })


    } catch (error) {
        console.log(error);
    }
})
app.get("/auth/google",passport.authenticate("google",{
    scope:["profile","email"],
}))
app.get("/auth/google/secrets",passport.authenticate("google",{
    successRedirect:"/index",
    failureRedirect:"/login"

}))
app.post("/login",passport.authenticate("local",{
    successRedirect:"/index",
    failureRedirect:"/login"
}))
app.post("/register",async (req,res)=>{
    const name=req.body.student_name;
    const email=req.body.email;
    const id=req.body.id;
    const enroll=req.body.enroll_no;
    const contact=req.body.contact_no;
    const password=req.body.password;
    try {
        const checkResult=await db.query("SELECT * FROM students WHERE email = $1",[email])
        if(checkResult.rows.length>0){
            res.redirect("/login");
        }
        else{
            bcrypt.hash(password,saltRounds,async (err,hash)=>{
                if(err){
                    console.log("Error in hashing password" + err);
                }
                else{
                    const result=await db.query("INSERT INTO students (id, name, email, contact_no, enroll_no, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",[id,name,email,contact,enroll,hash]);
                    const user=result.rows[0];
                    req.login(user,(err)=>{
                        console.log("success");
                        res.redirect("/index");
                    });
                }
            })
        }
    } catch (error) {
        console.log(error);
    }
})
passport.use("local",new Strategy(async function verify(username,password, cb){
    try {
        const result=await db.query("SELECT * FROM students WHERE email = $1",[username]);
        if(result.rows.length>0){
            const user=result.rows[0];
            const storedHashedPassword=user.password;
            bcrypt.compare(password,storedHashedPassword,(err,valid)=>{
                if(err){
                    console.error("Error comparing password ",err);
                }
                else{
                    if(valid){
                        return cb(null,user);
                    }
                    else{
                        return cb(null,false);
                    }
                }
            })
        }
        else{
            return cb("User not found");
        }
    } catch (err) {
       console.log(err);
    }
}))
passport.use("google",new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
},
async (accessToken,refreshToken,profile,cb)=>{
    try {
        console.log(profile);
        const result=await db.query("SELECT * FROM students WHERE email = $1",[profile.email]);
        if(result.rows.length===0){
            const newUser=await db.query("INSERT INTO students (id, name, email, contact_no, enroll_no, password) VALUES ($1, $2, $3, $4, $5, $6)",["12345","Manas",profile.email,"8855043340","BT22CSE123","google"]);
            return cb(null,newUser.rows[0]);
        }
        else{
            return cb(null,result.rows[0]);
        }
        
    } catch (err) {
        return cb(err);
    }
}


))
passport.serializeUser((user, cb) => {
    cb(null, user);
  });
  passport.deserializeUser((user, cb) => {
    cb(null, user);
});
app.post("/sell",upload.single("pic"),async(req,res)=>{

    const student_id=curr_user;
    const title=req.body.title;
    const description=req.body.description;
    const year_used=req.body.year;
    const price=req.body.price;
    console.log(req.file);
    const filepath=req.file.path;
    try {
        const uploadResult=await cloudinary.uploader.upload(filepath);
        console.log(uploadResult);
        const img_url=uploadResult.secure_url;
        try {
            await db.query("INSERT INTO products (title,price,description,year_used,image,student_id) VALUES ($1,$2,$3,$4,$5,$6)",[title,price,description,year_used,img_url,student_id]);
            res.redirect("/index");
        } catch (error) {
            console.log(error);

        }
        

    } catch (error) {
        console.log("-----------------");
        console.log(error);
    }


    

})
app.post("/buy",async (req,res)=>{
    const product_id=req.body["product_id"];
    const customer_id=curr_user;
    try {
        const res=await db.query("SELECT * FROM products WHERE (prod_id)=$1",[product_id]);
        const seller_id=res.rows[0].student_id;

        await db.query("INSERT INTO notifications (customer_id,product_id,seller_id) VALUES ($1,$2,$3)",[customer_id,product_id,seller_id]);
        
    } catch (error) {
        console.log(error);
    }

    

    res.redirect("/index");

})
app.post("/marked", async (req,res)=>{
    const notify_id=req.body["notify_id"];
    try {
        const res=await db.query("DELETE FROM notifications WHERE notify_id=$1",[notify_id]);

    } catch (error) {
        console.log(error);
    }
    res.redirect("/notification");

})
app.post("/cartremove",async (req,res)=>{
    const cart=req.body["cart_id"];
    try {
        const res=await db.query("DELETE FROM carts WHERE cart_id=$1",[cart]);

    } catch (error) {
        console.log(error);

    }
    res.redirect("/cart");
    
})
app.post("/cartadd",async(req,res)=>{
    try {
        const cart_id=req.body["cart_id"];
        console.log(cart_id);
        await db.query("INSERT INTO carts (cart_student_id,cart_product_id) VALUES ($1,$2)",[curr_user,cart_id]);
        res.redirect("/cart");


    } catch (error) {
        console.log(error);

    }
})


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
  