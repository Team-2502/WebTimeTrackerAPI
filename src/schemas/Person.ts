import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import * as mongoose from "mongoose";
import {Types} from "mongoose";
import {instanceMethod, InstanceType, pre, prop, Typegoose} from "typegoose";
import {Role} from "../Role";
import {Timetracker} from "../Timetracker";
import TimeEntrySchema, {TimeEntryModel} from "./TimeEntry";

@pre<PersonSchema>("save", async function (next) {
    if (this._id === undefined || this._id === null) {
        this._id = Types.ObjectId();
    }
    next();
})

export default class PersonSchema extends Typegoose {
    /* tslint:disable:variable-name */
    @prop() public _id?: Types.ObjectId;
    @prop() public firstName: string;
    @prop() public lastName: string;
    @prop() public email: string;

    @prop({ enum: Role }) public role: Role;

    @prop() private _passwordHash?: string;

    @instanceMethod
    public async setPassword(newPassword: string): Promise<void> {
        const salt = await bcrypt.genSalt(10);
        this._passwordHash = await bcrypt.hash(newPassword, salt);
    }

    @instanceMethod
    public async comparePassword(password: string): Promise<boolean> {
        return await bcrypt.compare(password, this._passwordHash);
    }

    @instanceMethod
    public async getTimeEntries(): Promise<Array<InstanceType<TimeEntrySchema>>> {  // ok ok.
        // this is an array of the instance types of a
        // TimeEntryScheme wrapped in a promise
        return await TimeEntryModel.find({
            _person: this._id
        })
    }

    @instanceMethod
    public async getActiveTimeEntry(): Promise<InstanceType<TimeEntrySchema>> {
        return await TimeEntryModel.findOne({
            timeEnded: undefined,
            _person: this._id
        });
    }

    @instanceMethod
    public async signIn(): Promise<void> {
        if (await this.getActiveTimeEntry() !== null) { throw new Error("User has an active time entry"); }
        const newEntry = new TimeEntryModel({
            timeStarted: new Date(),
            _person: this._id
        });
        await newEntry.save();
    }

    @instanceMethod
    public async signOut(): Promise<void> {
        const activeEntry = await this.getActiveTimeEntry();
        if (!activeEntry) { throw new Error("User does not have an active time entry"); }

        activeEntry.timeEnded = new Date();
        await activeEntry.save();
    }

    @instanceMethod
    public async getExpiredTimeEntries(): Promise<Array<InstanceType<TimeEntrySchema>>> {
        return await TimeEntryModel.find({
            _person: this._id,
            timedOut: true
        });
    }

    @instanceMethod
    public getAuthJson(): any {
        return {
            token: this.generateJWT(),
            firstName: this.firstName,
            lastName: this.lastName,
            id: this._id,
            role: this.role
        }
    }

    @instanceMethod
    public generateJWT() {
        const today = new Date();
        const expirationDate = new Date(today);
        expirationDate.setDate(today.getDate() + 182); // TODO: think about this...
        return jwt.sign(
            {
                email: this.email,
                firstName: this.firstName,
                lastName: this.lastName,
                role: this.role,
                id: this._id,
                exp: parseInt((expirationDate.getTime() / 1000).toString(), 10)
            },
            Timetracker.config.web.jwtSecret
        );
    }

}

export const PersonModel = new PersonSchema().getModelForClass(PersonSchema, {
    existingMongoose: mongoose,
    schemaOptions: {collection: "people"}
});
