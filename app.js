if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}

const express = require("express")
const path= require('path')
const mongoose= require('mongoose')
const ejsMate=require('ejs-mate')
const Joi=require('joi')
const {campgroundSchema,reviewSchema}=require('./schemas.js')
const catchAsync=require('./utils/catchAsync')
const methodOverride=require('method-override')
const ExpressError = require("./utils/ExpressError")
const session= require('express-session')
const flash= require('connect-flash')
const campgroundRoutes=require('./routes/campgrounds')
const reviewRoutes=require('./routes/reviews')
const userRoutes=require('./routes/users')
const passport=require('passport')
const LocalStrategy= require('passport-local')
const User=require('./models/user')
const helmet=require('helmet')
const mongoSanitize=require('express-mongo-sanitize');
const dbUrl=process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp'
const MongoDBStore=require("connect-mongo")

mongoose.connect(dbUrl)

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();
 
app.engine('ejs',ejsMate)
app.set('view engine','ejs') 
app.set('views',path.join(__dirname,'views'))

app.use(express.urlencoded({extended: true}))
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname,'public')))
app.use(mongoSanitize())

// const store=new MongoDBStore({
//     url: dbUrl,
//     secret: 'thisshouldsescret',
//     touchAfter: 24*60*60
// })

// store.on("error",function(e){
//     console.log("Session store error",e)
// })


const sessionConfig ={
    name: 'session',
    secret: 'thisshouldsescret',
    resave: false,
    saveUninitialized: true,
    cookie:{
        httpOnly:true,
        // secure:true,
        expires: Date.now()+ 1000*60*60*24*7,
        maxAge: 1000*60*60*24*7
    }
}
app.use(session(sessionConfig))
app.use(flash())
app.use(helmet())

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com",
    "https://api.tiles.mapbox.com",
    "https://api.mapbox.com",
    "https://kit.fontawesome.com",
    "https://cdnjs.cloudflare.com",
    "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com",
    "https://stackpath.bootstrapcdn.com",
    "https://api.mapbox.com",
    "https://api.tiles.mapbox.com",
    "https://fonts.googleapis.com",
    "https://use.fontawesome.com",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"

];
const connectSrcUrls = [
    "https://api.mapbox.com",
    "https://*.tiles.mapbox.com",
    "https://events.mapbox.com",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: 'self',
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/dnndujabj/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);


app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req,res,next) => {
    if(!['/login','/','/register'].includes(req.originalUrl)){
        req.session.returnTo=req.originalUrl
    }
    res.locals.currentUser=req.user;
    res.locals.success=req.flash('success')
    res.locals.error=req.flash('error')
    next()
}) 

app.use('/campgrounds',campgroundRoutes)
app.use('/campgrounds/:id/reviews',reviewRoutes)
app.use('/',userRoutes)

app.get('/', (req,res) =>{
    res.render('home')
})


 app.all('*',(req,res,next) =>{
     next(new ExpressError('Page not Found',404))
 })

app.use((err,req,res,next) =>{
    const {statusCode=500}=err;
    if(!err.message) err.message='Error'
    res.status(statusCode).render('error',{err})
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serving on port ${port}`)
})