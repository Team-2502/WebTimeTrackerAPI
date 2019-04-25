import * as passport from "passport";
import passportLocal = require("passport-local");
import {PersonModel} from "./schemas/Person";

export class Passport {
    public static bootstrap(){
        console.log("starting passport conf")
        passport.use(new passportLocal.Strategy({
            usernameField: "email",
            passwordField: "password"
        }, async (username, password, done) => {
            console.log("wwwwwwwwwwwwwwwwwwwwwott")
            try {
                console.log("hedasdsallo")
                const user = await PersonModel.findOne({email: username}).orFail();
                if (await user.comparePassword(password)) { return done(null, user); }
                else { return done(null, false, { message: "Invalid username/password" }); }
            } catch (e) {
                console.log("failed")
                return done(null, false, {message: e});
            }
        }))
    }
}