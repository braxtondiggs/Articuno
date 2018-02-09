# Articuno ![Articuno](cryptonym.png)

Get, convert and store all episodes of The All Out Show from Youtube

## Getting Started

### Prerequisites
- [Node.js and npm](nodejs.org) Node ^4.2.3, npm ^2.14.7
- [Heroku CLI](https://devcenter.heroku.com/articles/getting-started-with-nodejs) Heroku ^5.6.8
- [Node Foreman](https://github.com/strongloop/node-foreman) (`npm install --global foreman`)

## Build & Development

1. Run `npm install` to install server dependencies.

2. Run `heroku config:get CLOUDINARY_URL -s >> .env && heroku config:get GOOGLE_API -s >> .env && heroku config:get MONGODB_URI -s >> .env --app articuno1` to install Heroku Environment Variables.

3. Run `nf run npm run watch` to start the development server.
