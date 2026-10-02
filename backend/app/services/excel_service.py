"""Excel Export Service using openpyxl for Magna Opportunity Intelligence Platform."""

import io
from typing import Any, Dict, List, Optional
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter


def generate_contacts_excel(
    company_name: str,
    contacts: List[Dict[str, Any]],
    sheet_title: str = "Stakeholders",
) -> bytes:
    """
    Generate a professional styled .xlsx spreadsheet for unlocked contacts.

    Columns:
    1. No
    2. Nama
    3. Job Title / Jabatan
    4. Email
    5. Nomor Telepon
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    if ws is None:
        ws = wb.create_sheet(title=sheet_title[:31])
    else:
        ws.title = sheet_title[:31]

    # Styles
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    thin_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0"),
    )

    # Title block
    ws.merge_cells("A1:E1")
    ws["A1"] = f"Daftar Kontak Key Person - {company_name}"
    ws["A1"].font = Font(name="Calibri", size=14, bold=True, color="0F172A")
    ws["A1"].alignment = Alignment(vertical="center")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:E2")
    ws["A2"] = "Sumber: Lusha Prospecting Hub & Magna Stakeholder Directory"
    ws["A2"].font = Font(name="Calibri", size=9, italic=True, color="64748B")
    ws["A2"].alignment = Alignment(vertical="center")
    ws.row_dimensions[2].height = 18

    # Headers
    headers = [
        "No",
        "Nama",
        "Job Title / Jabatan",
        "Email",
        "Nomor Telepon",
    ]
    header_row = 4
    ws.row_dimensions[header_row].height = 24

    for col_idx, header_text in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=col_idx, value=header_text)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align if col_idx == 1 else header_align
        cell.border = thin_border

    # Data Rows
    current_row = 5
    for idx, c in enumerate(contacts, start=1):
        ws.row_dimensions[current_row].height = 20
        name = c.get("name") or c.get("full_name") or "-"
        job_title = c.get("job_title") or c.get("position") or "-"
        email = c.get("email") or "-"
        phone = c.get("phone") or c.get("whatsapp") or "-"

        row_data = [idx, name, job_title, email, phone]
        is_even = (idx % 2 == 0)

        for col_idx, val in enumerate(row_data, start=1):
            cell = ws.cell(row=current_row, column=col_idx, value=val)
            cell.font = Font(name="Calibri", size=10, color="1E293B")
            cell.border = thin_border
            cell.alignment = center_align if col_idx == 1 else left_align
            if is_even:
                cell.fill = zebra_fill

        current_row += 1

    # Auto-fit column widths
    for col in ws.columns:
        max_len = 0
        first_cell = col[0]
        if first_cell.column is None:
            continue
        col_letter = get_column_letter(int(first_cell.column))
        for cell in col:
            if cell.row is not None and cell.row < header_row:
                continue
            if cell.value:
                max_len = max(max_len, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    # Specific minimum width adjustments
    ws.column_dimensions["A"].width = 6   # No
    ws.column_dimensions["B"].width = 28  # Nama
    ws.column_dimensions["C"].width = 34  # Job Title
    ws.column_dimensions["D"].width = 30  # Email
    ws.column_dimensions["E"].width = 22  # Nomor Telepon

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    return out.getvalue()
