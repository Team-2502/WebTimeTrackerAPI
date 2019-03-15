import * as mongoose from "mongoose";
import {Types} from "mongoose";
import {post, pre, prop, Ref, Typegoose} from "typegoose";
import Person from "./Person";

@pre<TimeEntrySchema>("save", async function (next) {
    if (this._id === undefined || this._id === null) {
        this._id = Types.ObjectId();
    }
    next();
})
@post<TimeEntrySchema>("find", async docs => {
    for (const doc of docs) {
        if (doc === undefined || doc === null) return;
        await doc.populate({
            path: "_person",
            model: Person.name
        }).execPopulate();
    }
})
@post<TimeEntrySchema>("findOne", async doc => {
    if (doc === undefined || doc === null) return;
    await doc.populate({
        path: "_person",
        model: Person.name
    }).execPopulate();
})

export default class TimeEntrySchema extends Typegoose {
    @prop() public _id?: Types.ObjectId;
    @prop() public timeStarted: Date;
    @prop() public timeEnded?: Date;
    @prop({ref: Person}) public _person: Ref<Person>;
    @prop() public timedOut?: boolean;
}

export const TimeEntryModel = new TimeEntrySchema().getModelForClass(TimeEntrySchema, {
    existingMongoose: mongoose,
    schemaOptions: {collection: "entries"}
});
