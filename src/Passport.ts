import * as passport from "passport";
import passportLocal = require("passport-local");
import {PersonModel} from "./schemas/Person";

export class Passport {
    public static bootstrap(){
        passport.use(new passportLocal.Strategy({
            usernameField: "email",
            passwordField: "password"
        }, async (username, password, done) => {
            try {
                const user = await PersonModel.findOne({email: username}).orFail();
                if (await user.comparePassword(password)) { return done(null, user); }
                else { return done(null, false, { message: "Invalid username/password" }); }
            } catch (e) {
                return done(null, false, {message: e});
            }
        }))
    }
}
