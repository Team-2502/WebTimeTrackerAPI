import {ObjectID} from "bson";
import * as ejwt from "express-jwt";
import {Role} from "../../Role";
import {PersonModel} from "../../schemas/Person";
import {Timetracker} from "../../Timetracker";

export class AuthMiddleware {

    public static isMentor = async (req, res, next) => {
        try{
            const user = await PersonModel.findById(new ObjectID(req.payload.id)).orFail();
            if (user.role !== Role.MENTOR) { return next('not_mentor', {message: 'You don\'t have permissions to access this page.' }); }
        }catch (e) {
            return next(e);
        }

        return next();
    };

    private static getToken = (req: any) => {
        const {
            headers: { authorization }
        } = req;

        if (authorization && authorization.split(" ")[0] === "Bearer") {
            return authorization.split(" ")[1];
        }
        return null;
    };

    private static getSecret = (req, payload, done) => {
        done(null, Timetracker.config.web.jwtSecret);
    };

    // We need this to be after the previous functions are defined. Blame Typescript and express-jwt.
    /* tslint:disable:member-ordering */
    /* tslint:disable:object-literal-sort-keys */
    public static jwtAuth = {
        required: ejwt({
            secret: AuthMiddleware.getSecret,
            userProperty: "payload",
            getToken: AuthMiddleware.getToken
        }),
        optional: ejwt({
            secret: AuthMiddleware.getSecret,
            userProperty: "payload",
            getToken: AuthMiddleware.getToken,
            credentialsRequired: false
        })
    };
}