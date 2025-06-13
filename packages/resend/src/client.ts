import { Resend } from "resend";
import { env } from "@flote/env";

export const resend = new Resend(env().RESEND_API_KEY);