import { Router } from "express";
import petrol_ofisi_router from "./petrol-ofisi";

const router = Router();

router.use("/petrol-ofisi", petrol_ofisi_router);

export default router;
