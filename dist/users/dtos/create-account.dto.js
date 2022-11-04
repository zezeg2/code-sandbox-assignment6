"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAccountOutput = exports.CreateAccountInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const user_entity_1 = require("../entities/user.entity");
const output_dto_1 = require("./output.dto");
let CreateAccountInput = class CreateAccountInput extends graphql_1.PartialType(user_entity_1.User) {
};
CreateAccountInput = __decorate([
    graphql_1.InputType()
], CreateAccountInput);
exports.CreateAccountInput = CreateAccountInput;
let CreateAccountOutput = class CreateAccountOutput extends output_dto_1.CoreOutput {
};
CreateAccountOutput = __decorate([
    graphql_1.ObjectType()
], CreateAccountOutput);
exports.CreateAccountOutput = CreateAccountOutput;
//# sourceMappingURL=create-account.dto.js.map