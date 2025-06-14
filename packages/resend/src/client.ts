import { Resend } from "resend";
import { env } from "@starter-kit/env";

export const resend = new Resend(env().RESEND_API_KEY);