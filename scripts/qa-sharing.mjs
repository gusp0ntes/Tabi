import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const root = process.env.TABI_QA_URL || "http://127.0.0.1:5181";
if (!["localhost", "127.0.0.1"].includes(new URL(root).hostname))
  throw new Error("Run this check against the isolated local QA API.");
await mkdir(".local/qa", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ownerContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const visitorContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const guestContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const errors = [];
for (const context of [ownerContext, visitorContext, guestContext])
  context.on("page", (page) =>
    page.on("pageerror", (e) => errors.push(e.message)),
  );
const headers = { Origin: root, "X-Tabi-Request": "1" };
const stamp = Date.now();
try {
  const registration = await ownerContext.request.post(
    root + "/api/auth/register",
    {
      headers,
      data: {
        name: "Organizador QA",
        email: `owner-sharing-${stamp}@example.test`,
        password: "Uma jornada em companhia!",
      },
    },
  );
  expect(registration.status()).toBe(201);
  const created = await ownerContext.request.post(root + "/api/trips", {
    headers,
    data: {
      countryCode: "JP",
      travelers: 2,
      days: 15,
      startDate: "2028-10-08",
      style: "balanced",
    },
  });
  expect(created.status()).toBe(201);
  const trip = (await created.json()).trip;
  const page = await ownerContext.newPage();
  const visitor = await visitorContext.newPage();
  const guest = await guestContext.newPage();
  await page.goto(root + "/app/" + trip.id);
  await expect(page.locator(".workspace")).toBeVisible();
  await page
    .getByRole("button", { name: "Compartilhar viagem", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Criar link de visualização", exact: true })
    .click();
  const publicUrl = await page
    .getByLabel("Link de visualização", { exact: true })
    .inputValue();
  await page.getByRole("button", { name: "Copiar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Copiado", exact: true }),
  ).toBeVisible();
  await visitor.goto(publicUrl);
  await expect(
    visitor.getByRole("heading", { name: trip.title, exact: true }),
  ).toBeVisible();
  await expect(
    visitor.getByText("Somente visualização", { exact: true }),
  ).toBeVisible();
  await expect(
    visitor.getByRole("heading", {
      name: "Por onde essa viagem passa",
      exact: true,
    }),
  ).toBeVisible();
  await expect(visitor.locator("input, textarea, select")).toHaveCount(0);
  await expect(
    visitor.getByRole("button", { name: "Editar viagem", exact: true }),
  ).toHaveCount(0);
  expect(await visitorContext.cookies()).toHaveLength(0);
  await visitor.evaluate(() => document.fonts.ready);
  expect(
    await visitor.evaluate(() => document.fonts.check('400 16px "Inter"')),
  ).toBe(true);
  await visitor.screenshot({
    path: ".local/qa/shared-desktop-dark.png",
    fullPage: true,
  });
  console.log(
    "Public overview opens without login, private fields or editing controls.",
  );

  await page
    .getByRole("button", { name: "Criar convite", exact: true })
    .click();
  const inviteUrl = await page
    .getByLabel("Convite para participar", { exact: true })
    .inputValue();
  await guest.goto(inviteUrl);
  await expect(
    guest.getByRole("heading", { name: "Vamos planejar juntos?", exact: true }),
  ).toBeVisible();
  await guest.screenshot({
    path: ".local/qa/invite-desktop.png",
    fullPage: true,
  });
  await guest
    .getByRole("link", { name: "Entrar para aceitar", exact: true })
    .click();
  await guest.getByRole("link", { name: "Começar agora", exact: true }).click();
  await guest.getByLabel("Seu nome", { exact: true }).fill("Convidada QA");
  await guest
    .getByLabel("E-mail", { exact: true })
    .fill(`guest-sharing-${stamp}@example.test`);
  await guest
    .getByLabel("Senha", { exact: true })
    .fill("Uma jornada em companhia!");
  await guest
    .getByRole("button", { name: "Criar minha conta", exact: true })
    .click();
  await expect(
    guest.getByRole("button", {
      name: "Aceitar convite e participar",
      exact: true,
    }),
  ).toBeVisible();
  await guest
    .getByRole("button", { name: "Aceitar convite e participar", exact: true })
    .click();
  await expect(guest.locator(".workspace")).toBeVisible();
  await expect(
    guest.getByText("Viagem compartilhada com você · pode editar", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    guest.getByRole("button", { name: "Compartilhar viagem", exact: true }),
  ).toHaveCount(0);
  await guest
    .getByLabel("Dinheiro guardado agora (R$)", { exact: true })
    .fill("10000");
  await expect(guest.locator(".save-status")).toContainText(
    "Salvo na sua conta",
  );
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByLabel("Dinheiro guardado agora (R$)", { exact: true }),
  ).toHaveValue("10000", { timeout: 20000 });
  console.log(
    "Invitation survives signup, participant edits persist and synchronize to the owner.",
  );

  for (const width of [390, 360]) {
    await visitor.setViewportSize({ width, height: 844 });
    await visitor.screenshot({
      path: `.local/qa/shared-mobile-${width}.png`,
      fullPage: true,
    });
    expect(
      await visitor.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.setViewportSize({ width, height: 844 });
    await page
      .getByRole("button", { name: "Compartilhar viagem", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page
        .getByRole("dialog")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
    await page.screenshot({
      path: `.local/qa/sharing-modal-mobile-${width}.png`,
      fullPage: true,
    });
    await expect(page.getByText("Convidada QA", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    const viewportFits = await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    );
    expect(viewportFits).toBe(true);
    await page.screenshot({
      path: `.local/qa/workspace-modern-mobile-${width}.png`,
      fullPage: true,
    });
  }
  await visitor
    .getByRole("button", { name: "Ativar modo claro", exact: true })
    .click();
  await visitor.screenshot({
    path: ".local/qa/shared-mobile-light.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Compartilhar viagem", exact: true })
    .click();
  await page.screenshot({
    path: ".local/qa/sharing-modal-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Remover", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirmar remoção", exact: true })
    .click();
  await expect(page.getByText("Convidada QA", { exact: true })).toHaveCount(0);
  await guest.reload();
  await expect(
    guest.getByRole("heading", {
      name: "Não conseguimos abrir essa viagem.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Desativar link", exact: true })
    .click();
  await visitor.reload();
  await expect(
    visitor.getByRole("heading", {
      name: "Essa jornada está reservada.",
      exact: true,
    }),
  ).toBeVisible();
  console.log(
    "Removing a participant and disabling a public link revoke their access.",
  );

  await page.goto(root);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: ".local/qa/landing-modern-desktop.png",
    fullPage: true,
  });
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    await page.screenshot({
      path: `.local/qa/landing-modern-mobile-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
  console.log(
    "Sharing, invitations, font loading and mobile layouts passed without browser errors.",
  );
} finally {
  await browser.close();
}
