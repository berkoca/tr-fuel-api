import puppeteer, { Page } from "puppeteer";
import { FuelCompany } from "../base/FuelCompany";

class PetrolOfisi implements FuelCompany {
  private fuel_url: string =
    "https://www.petrolofisi.com.tr/akaryakit-fiyatlari";

  public async getFuelPrices(): Promise<string[]> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(this.fuel_url, { waitUntil: "networkidle2" });
    await page.waitForSelector("ul", { visible: true });

    const fuelData = await this.getFuelData(page);
    const parsedfuelData = this.parseFuelData(fuelData as string[]);

    await page.close();
    await browser.close();

    return parsedfuelData;
  }

  public async getCities() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(this.fuel_url, { waitUntil: "networkidle2" });
    await page.waitForSelector("ul", { visible: true });

    const citiesData = await this.getCitiesData(page);

    await page.close();
    await browser.close();

    return citiesData;
  }

  private async getFuelData(page: Page) {
    return await page.evaluate(`(async () => {
        return await new Promise((resolve) => {
          setTimeout(() => {
            const array = [];
            const list = $("li.list-group-item.p-3");
            for (let i = 0; i <= list.length - 1; i++) {
              array.push(list[i].innerText);
            }
            resolve(array);
          }, 500);
        });
      })()`);
  }

  /**
   * Each list item's innerText is the city name followed by alternating
   * "<fuel name>\n<price>" lines. The set of fuels changes over time
   * (V/Pro Diesel is gone; Gazyağı, Kalorifer Yakıtı and Fuel Oil were added),
   * so pair labels with values instead of relying on fixed indexes.
   */
  private parseFuelData(fuelData: string[]): any[] {
    const parsedData: any[] = [];

    for (const line of fuelData) {
      const lines = line
        .split("\n")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      const row: Record<string, string> = { city: lines[0] };
      for (let i = 1; i + 1 < lines.length; i += 2) {
        row[lines[i]] = lines[i + 1];
      }

      parsedData.push(row);
    }

    return parsedData;
  }

  private async getCitiesData(page: Page) {
    return await page.evaluate(`(async () => {
      return await new Promise((resolve) => {
        setTimeout(() => {
          const array = [];
          $("select option").each(function(){
              array.push(this.innerText);
          });
          array.shift();
          resolve(array);
        }, 500);
      });
    })()`);
  }
}

export default PetrolOfisi;
