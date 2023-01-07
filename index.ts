import express from "express";
import cors from "cors";
import PetrolOfisi from "./library/fuel-company/PetrolOfisi";

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());

app.get("/petrol-ofisi", async (req, res, next) => {
  const petrolOfisi = new PetrolOfisi();
  const fuelPrices = await petrolOfisi.getFuelPrices();

  return res.json(fuelPrices);
});

app.listen(port, () => console.log(`App listening on port ${port}.`));
