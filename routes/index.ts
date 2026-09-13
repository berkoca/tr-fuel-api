import { Router } from "express";
import petrol_ofisi_router from "./petrol-ofisi";
import shell_router from "./shell";

const router = Router();

router.use("/petrol-ofisi", petrol_ofisi_router);
router.use("/shell", shell_router);

export default router;
