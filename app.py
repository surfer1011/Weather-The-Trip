from flask import Flask, request, redirect, render_template, flash, session, g
from flask_debugtoolbar import DebugToolbarExtension
# from flask_wtf import FlaskForm
# from flask_mail import Message, Mail
# from threading import Thread

from models import db, connect_db, User, Trip, UserTrip, Weather, TripWeather
from forms import TripForm, LocationForm, LoginForm
from pws import GOOGLE_MAPS_KEY
import os


app = Flask(__name__)
# DEVELOPMENT
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///weather_the_trip'
db.init_app(app)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = True
app.config['SQLALCHEMY_ECHO'] = True
# use secret key in production or default to our dev one
app.config['SECRET_KEY'] = 'verysecret'
app.config['DEBUG_TB_INTERCEPT_REDIRECTS'] = False  # DEVELOPMENT

db.init_app(app)

debug = DebugToolbarExtension(app)


@app.before_request
def before_request():
    if 'email' in session:
        g.user = User.query.filter(User.email == session['email']).first()
    else:
        g.user = None


@app.route('/')
def home():
    login_form = LoginForm()
    return render_template('home.html', login_form=login_form, GOOGLE_MAPS_KEY=GOOGLE_MAPS_KEY, user=g.user)


@app.route('/login', methods=['POST'])
def login():
    login_form = LoginForm()
    if login_form.validate_on_submit():
        email = login_form.email.data
        password = login_form.password.data
        user = User.authenticate(email, password)

        if(user):
            session['email'] = user.email
        else:
            flash('Incorrect email or password!', 'danger')

    return redirect('/')


@app.route('/logout')
def logout():
    session['email'] = None
    return redirect('/')
