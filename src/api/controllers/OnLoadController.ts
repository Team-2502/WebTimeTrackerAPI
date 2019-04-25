import {ObjectID} from "bson";
import {Router} from "express";
import {Role} from "../../Role";
import {PersonModel} from "../../schemas/Person";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {IController} from "./IController";

export class OnLoadController implements IController{
    public initRoutes = (expressRouter: Router) => {
        expressRouter.get("/onLoad", AuthMiddleware.jwtAuth.required, this.onLoad);
    };

    private onLoad = async (req, res, next) => {
        try {
            const user = await PersonModel.findById(new ObjectID(req.payload.id)).orFail();
            const isMentor = user.role === Role.MENTOR;

            return res.json({
                isAuthorized: isMentor
            })
        }catch (e) {
            return next(e);
        }
    };
}
