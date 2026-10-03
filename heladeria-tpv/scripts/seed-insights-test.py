#!/usr/bin/env python3
"""
SOLO PARA PRUEBAS. No se incluye en el instalador ni se usa en produccion.

Siembra ventas de prueba en una COPIA de heladeria.db para verificar el
panel de analisis (/api/insights). Detener el backend antes de correrlo.

Uso:
    py scripts/seed-insights-test.py RUTA/heladeria.db --today low
    py scripts/seed-insights-test.py RUTA/heladeria.db --today normal

Genera (ultimos 30 dias, hora de Colombia):
  - Ventas diarias de 12 m a 9 pm, con la franja 3-5 pm floja (VALLEY_PROMO).
  - "Acai 9oz" + "Cookie" y "Malteada" + "Cookie" juntos (COMBO).
  - "Brownie" que se vendia y casi dejo de venderse (PRODUCT_DROP).
  - "Paleta de mora" disponible pero sin ventas (DEAD_PRODUCT).
  - Ventas ANULADAS enormes a las 3 am que NO deben aparecer en ningun calculo.
  - Turno abierto hace 3 horas y ventas de hoy bajas o normales
    (LOW_SALES_TODAY se dispara solo con --today low).
"""
import argparse
import os
import sqlite3
import sys
from datetime import datetime, timedelta, timezone

BOGOTA = timezone(timedelta(hours=-5))  # Colombia no usa horario de verano


def ms(dt):
    return int(dt.timestamp() * 1000)


def product_id(c, name, category, price):
    row = c.execute("select id from products where name = ?", (name,)).fetchone()
    if row:
        return row[0]
    c.execute("insert into products (available, category, name, price) values (1, ?, ?, ?)",
              (category, name, price))
    return c.execute("select last_insert_rowid()").fetchone()[0]


def add_order(c, register_id, when, items, status="CONFIRMADO", motivo=None):
    total = sum(q * price for _, q, price in items)
    c.execute(
        "insert into orders (created_at, payment_method, status, total, cash_register_id, user_id,"
        " motivo_anulacion, voided_at) values (?, 'EFECTIVO', ?, ?, ?, 1, ?, ?)",
        (ms(when), status, total, register_id, motivo, ms(when) if status == "ANULADO" else None))
    order_id = c.execute("select last_insert_rowid()").fetchone()[0]
    for pid, q, price in items:
        c.execute("insert into order_items (quantity, unit_price, order_id, product_id) values (?, ?, ?, ?)",
                  (q, price, order_id, pid))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("db")
    parser.add_argument("--today", choices=["low", "normal"], default="low")
    args = parser.parse_args()

    path = os.path.abspath(args.db)
    if "roaming" in path.lower() and "heladeria-tpv" in path.lower():
        sys.exit("Rechazado: parece la base de datos real de la app (AppData). Usa una copia.")

    c = sqlite3.connect(path)
    acai = product_id(c, "Acai 9oz", "ACAI", 18000)
    cookie = product_id(c, "Cookie", "POSTRES", 7000)
    malteada = product_id(c, "Malteada", "BEBIDAS", 12000)
    brownie = product_id(c, "Brownie", "POSTRES", 8000)
    product_id(c, "Paleta de mora", "PALETAS", 5000)

    now = datetime.now(BOGOTA)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Turno historico (cerrado) para las ventas sembradas.
    c.execute("update cash_registers set closed_at = ? where closed_at is null", (ms(now - timedelta(hours=3, minutes=1)),))
    c.execute("insert into cash_registers (cashier_name, opened_at, closed_at, opening_amount, opened_by_id)"
              " values ('Seed', ?, ?, 0, 1)", (ms(today - timedelta(days=31)), ms(today - timedelta(seconds=1))))
    seed_register = c.execute("select last_insert_rowid()").fetchone()[0]

    orders_per_hour = {12: 3, 13: 4, 14: 3, 15: 1, 16: 1, 17: 3, 18: 5, 19: 5, 20: 4}
    early_time = (now - timedelta(minutes=90)).time()

    for d in range(1, 31):
        day = today - timedelta(days=d)
        for hour, count in orders_per_hour.items():
            for i in range(count):
                when = day.replace(hour=hour, minute=5 + i * 10)
                if i % 3 == 0:
                    items = [(malteada, 1, 12000), (cookie, 1, 7000)]
                else:
                    items = [(acai, 1, 18000), (cookie, 1, 7000)]
                add_order(c, seed_register, when, items)
        # Brownie: 2 diarios en la semana anterior, casi nada en la ultima.
        if 8 <= d <= 14:
            add_order(c, seed_register, day.replace(hour=13, minute=50), [(brownie, 2, 8000)])
        if d == 3:
            add_order(c, seed_register, day.replace(hour=13, minute=50), [(brownie, 1, 8000)])
        # Anuladas enormes a las 3 am: no deben contar.
        add_order(c, seed_register, day.replace(hour=3, minute=30), [(acai, 100, 18000)],
                  status="ANULADO", motivo="seed")

    # Mismo dia de la semana, 4 semanas atras: ventas antes de la hora actual,
    # para comparar con hoy (LOW_SALES_TODAY).
    for w in range(1, 5):
        day = today - timedelta(weeks=w)
        when = datetime.combine(day.date(), early_time, BOGOTA)
        add_order(c, seed_register, when, [(acai, 2, 18000)])
        add_order(c, seed_register, when, [(acai, 2, 18000)])

    # Turno abierto hace 3 horas y ventas de hoy.
    c.execute("insert into cash_registers (cashier_name, opened_at, opening_amount, opened_by_id)"
              " values ('Ana', ?, 0, 1)", (ms(now - timedelta(hours=3)),))
    open_register = c.execute("select last_insert_rowid()").fetchone()[0]
    today_when = now - timedelta(minutes=90)
    if args.today == "low":
        add_order(c, open_register, today_when, [(cookie, 1, 7000)])
    else:
        add_order(c, open_register, today_when, [(acai, 2, 18000)])
        add_order(c, open_register, today_when, [(acai, 2, 18000)])

    c.commit()
    print(f"Listo: datos de prueba sembrados en {path} (hoy = {args.today})")


if __name__ == "__main__":
    main()
