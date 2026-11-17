import { chromium, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
await mkdir(".local/qa", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const root = process.env.TABI_QA_URL || "http://127.0.0.1:5181";
const email = `tabi-qa-${Date.now()}@example.test`,
  password = "Uma viagem bem planejada!";
async function go(name) {
  const button = page
    .getByRole("navigation", { name: "Navegação da viagem" })
    .getByRole("button", { name, exact: true });
  if (!(await button.isVisible()))
    await page
      .getByRole("button", { name: "Mais da viagem", exact: true })
      .click();
  await button.click();
}
await page.goto(root);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({
  path: ".local/qa/landing-desktop.png",
  fullPage: true,
});
await page
  .getByRole("link", { name: "Começar minha jornada", exact: true })
  .click();
await page.getByLabel("País", { exact: true }).selectOption("JP");
await page.getByRole("button", { name: "Continuar", exact: true }).click();
for (let i = 0; i < 8; i++)
  await page.getByRole("button", { name: "Aumentar dias no destino" }).click();
await page.getByLabel("Chegada ao destino").fill("2028-10-08");
await page.getByRole("button", { name: "Continuar com minha conta" }).click();
await page.getByLabel("Seu nome", { exact: true }).fill("QA Tabi");
await page.getByLabel("E-mail", { exact: true }).fill(email);
await page.getByLabel("Senha", { exact: true }).fill(password);
await page
  .getByRole("button", { name: "Criar minha conta", exact: true })
  .click();
await page
  .getByRole("button", { name: "Criar minha viagem", exact: true })
  .click();
await expect(
  page.getByRole("heading", {
    name: "Sua próxima viagem está tomando forma...",
  }),
).toBeVisible();
await expect(page.locator(".workspace")).toBeVisible();
const tripId = new URL(page.url()).pathname.split("/").at(-1);
const getTrip = async () =>
  (await (await page.request.get(root + "/api/trips/" + tripId)).json()).trip;
await page
  .getByLabel("Dinheiro guardado agora (R$)", { exact: true })
  .fill("10000");
await expect.poll(async () => (await getTrip()).cash).toBe(10000);
await expect(page.locator(".save-status")).toContainText("Salvo na sua conta");
await page.reload();
await expect(page.getByLabel("Dinheiro guardado agora (R$)")).toHaveValue(
  "10000",
);
await page.screenshot({
  path: ".local/qa/workspace-desktop.png",
  fullPage: true,
});
await go("Roteiro");
await page.getByRole("button", { name: "Mover Tóquio para baixo" }).click();
await page
  .getByRole("button", { name: "Adicionar cidade", exact: true })
  .click();
await page
  .getByRole("dialog")
  .getByRole("combobox", { name: "Cidade", exact: true })
  .fill("Nara");
await page.getByLabel("Dias nessa cidade").fill("2");
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Adicionar cidade", exact: true })
  .click();
await expect.poll(async () => (await getTrip()).days).toBe(17);
expect((await getTrip()).route[0].city).toBe("Kyoto");
await go("Orçamento");
await page.getByLabel("Orçamento de Passagens", { exact: true }).fill("6000");
await expect.poll(async () => (await getTrip()).costs.flights).toBe(6000);
await go("Calendário");
await page
  .getByRole("button", { name: "8 de outubro, Kyoto", exact: true })
  .click();
await page.getByLabel("Anotações desse dia").fill("Um café e uma caminhada.");
await page.getByLabel("Anotações desse dia").pressSequentially(" Sem pressa.");
await expect
  .poll(async () => (await getTrip()).notes["2028-10-08"])
  .toBe("Um café e uma caminhada. Sem pressa.");
await page.getByRole("button", { name: "Ajustar datas e voos" }).click();
await page.locator(".flight-settings summary").click();
await page.getByLabel("Embarque de ida").fill("2028-10-06");
await page.getByLabel("Chegada de volta").fill("2028-10-25");
await page
  .getByRole("button", { name: "Salvar alterações", exact: true })
  .click();
await expect(page.locator(".calendar-day.is-flight")).toHaveCount(5);
await page.screenshot({
  path: ".local/qa/calendar-desktop.png",
  fullPage: true,
});
await go("Explorar o destino");
await page
  .getByRole("button", {
    name: "Salvar Fushimi Inari nos favoritos",
    exact: true,
  })
  .click();
await page
  .getByRole("button", { name: "Incluir no dia 1", exact: true })
  .first()
  .click();
await expect.poll(async () => (await getTrip()).activities.length).toBe(1);
await go("Reservas");
await page
  .getByRole("button", { name: "Adicionar reserva", exact: true })
  .click();
await page.getByLabel("Nome da reserva").fill("Hotel QA perto da estação");
await page.getByLabel("Valor total (R$)", { exact: true }).fill("2000");
await page.getByLabel("Essa reserva já está totalmente paga.").check();
await page.getByRole("button", { name: "Salvar reserva", exact: true }).click();
await expect.poll(async () => (await getTrip()).bookings[0]?.paid).toBe(true);
await go("Checklist 0/6");
await page
  .getByLabel("O que mais não podemos esquecer?")
  .fill("Reservar um jantar");
await page.getByRole("button", { name: "Adicionar lembrete" }).click();
await page
  .getByRole("button", { name: "Concluir Reservar um jantar", exact: true })
  .click();
await expect
  .poll(async () => (await getTrip()).checklist.at(-1).done)
  .toBe(true);
await page.locator(".sidebar-account").click();
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "Exportar esta viagem" }).click(),
]);
await download.saveAs(".local/qa/backup.json");
expect(JSON.parse(await readFile(".local/qa/backup.json", "utf8")).cash).toBe(
  10000,
);
await page.getByRole("button", { name: "Sair da conta", exact: true }).click();
await page.goto(root + "/entrar");
await page.getByLabel("E-mail", { exact: true }).fill(email);
await page.getByLabel("Senha", { exact: true }).fill("Senha incorreta");
await page.getByRole("button", { name: "Entrar na minha conta" }).click();
await expect(page.getByRole("alert")).toContainText(
  "E-mail ou senha incorretos.",
);
await page.getByLabel("Senha", { exact: true }).fill(password);
await page.getByRole("button", { name: "Entrar na minha conta" }).click();
await expect(page.locator(".my-trip-grid .trip-card")).toHaveCount(1);
await page.goto(root + "/nova-viagem?pais=US&cidade=Nova%20York");
await page.getByRole("button", { name: "Continuar", exact: true }).click();
await page
  .getByRole("button", { name: "Criar minha viagem", exact: true })
  .click();
await expect(page.locator(".app-shell")).toHaveClass(/region-americas/);
await expect(page.locator(".trip-hero h2")).toContainText("Nova York");
await page.screenshot({ path: ".local/qa/workspace-usa.png", fullPage: true });
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
mobile.on("pageerror", (e) => errors.push(e.message));
await mobile.goto(root);
await mobile.evaluate(() => document.fonts.ready);
await mobile.locator('img[loading="lazy"]').evaluateAll((images) =>
  images.forEach((image) => {
    image.loading = "eager";
  }),
);
await mobile
  .locator("img")
  .evaluateAll((images) =>
    Promise.all(images.map((image) => image.decode().catch(() => {}))),
  );
await mobile.screenshot({
  path: ".local/qa/landing-mobile.png",
  fullPage: true,
});
await mobile.getByRole("button", { name: "Ativar modo claro" }).click();
await mobile.reload();
await expect(mobile.locator("html")).toHaveAttribute("data-theme", "light");
await mobile.getByRole("button", { name: "Ativar modo escuro" }).click();
await mobile
  .getByRole("link", { name: "Começar minha jornada", exact: true })
  .click();
await mobile.getByLabel("País", { exact: true }).selectOption("NZ");
await mobile.getByRole("combobox", { name: /Cidade/ }).fill("Queenstown");
await mobile.getByRole("button", { name: "Continuar", exact: true }).click();
await mobile.screenshot({
  path: ".local/qa/onboarding-mobile.png",
  fullPage: true,
});
await mobile.getByRole("button", { name: "Continuar com minha conta" }).click();
await mobile.getByLabel("Seu nome", { exact: true }).fill("Outra conta QA");
await mobile.getByLabel("E-mail", { exact: true }).fill("other-" + email);
await mobile.getByLabel("Senha", { exact: true }).fill(password);
await mobile
  .getByRole("button", { name: "Criar minha conta", exact: true })
  .click();
await mobile
  .getByRole("button", { name: "Criar minha viagem", exact: true })
  .click();
await expect(mobile.locator(".app-shell")).toHaveClass(/region-oceania/);
expect((await mobile.request.get(root + "/api/trips/" + tripId)).status()).toBe(
  404,
);
await mobile.screenshot({
  path: ".local/qa/workspace-mobile.png",
  fullPage: true,
});
for (const name of [
  "Roteiro",
  "Orçamento",
  "Calendário",
  "Explorar o destino",
  "Reservas",
  "Checklist 0/6",
  "Minha viagem",
]) {
  await mobile.getByRole("button", { name: "Abrir navegação" }).click();
  const target = mobile
    .getByRole("navigation", { name: "Navegação da viagem" })
    .getByRole("button", { name, exact: true });
  if (!(await target.isVisible()))
    await mobile
      .getByRole("button", { name: "Mais da viagem", exact: true })
      .click();
  await target.click();
  await mobile.waitForTimeout(250);
  expect(
    await mobile.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
}
await mobile.setViewportSize({ width: 360, height: 800 });
await mobile.waitForTimeout(250);
expect(
  await mobile.evaluate(() => document.documentElement.scrollWidth),
).toBeLessThanOrEqual(360);
expect(errors).toEqual([]);
// A delayed anonymous session response must not undo a completed registration.
const race = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const held = [];
await race.route("**/api/auth/me", (route) => {
  held.push(route);
});
await race.goto(root + "/cadastro");
await race
  .getByLabel("Seu nome", { exact: true })
  .fill("Conta com sessão lenta");
await race.getByLabel("E-mail", { exact: true }).fill("race-" + email);
await race.getByLabel("Senha", { exact: true }).fill(password);
await race
  .getByRole("button", { name: "Criar minha conta", exact: true })
  .click();
await expect(race.locator(".my-trips")).toBeVisible();
for (const route of held)
  await route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ message: "Entre na sua conta." }),
  });
await race.waitForTimeout(250);
await expect(race.locator(".my-trips")).toBeVisible();
console.log(
  "PASS: landing, cadastro, login/logout, criação em dois passos, loading, Japão/EUA/Nova Zelândia, isolamento de contas, persistência, autosave, roteiro, orçamento, voos, anotações, guias, reservas, checklist, exportação, temas e celular.",
);
await browser.close();
