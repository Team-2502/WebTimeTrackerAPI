import {ObjectID} from "bson";
import {Router} from "express";
import {Role} from "../../Role";
import {PersonModel} from "../../schemas/Person";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {IController} from "./IController";

export class OnLoadController implements IController{
    public initRoutes = (expressRouter: Router) => {
        expressRouter.get("/onLoad", AuthMiddleware.jwtAuth.optional, this.onLoad);
    };

    private onLoad = async (req, res, next) => {
        if (req.payload && req.payload.id) {
            try {
                const user = await PersonModel.findById(new ObjectID(req.payload.id)).orFail();
                const isAuthorized = user.role === Role.MENTOR;

                return res.json({
                    isAuthorized
                })
            } catch (e) {
                return next(e);
            }
        }
    };
}
