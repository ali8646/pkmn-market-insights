import express, { Express, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";


const primsa = new PrismaClient();
const app: Express = express();
const port = 4000;

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});