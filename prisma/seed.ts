import {
  PrismaClient,
  ProjectStage,
  ProjectType,
  ProjectStatus,
  MilestoneStatus,
  InvoiceStatus,
  DrawingType,
  DrawingStatus,
  LeadSource,
  LeadStage,
  ActivityType,
  VendorCategory,
  UserRole,
  IssueSeverity,
  IssueStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// Pass your real Clerk userId as an env var to link the demo firm to your account.
//   OWNER_CLERK_ID=user_xxxx npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
const OWNER_CLERK_ID = process.env.OWNER_CLERK_ID || "demo_owner_clerk_id";

const placeholderDrawing = (slug: string) =>
  `https://placehold.co/1200x800/111318/E8A045?text=${encodeURIComponent(slug)}`;

const placeholderPhoto = (label: string) =>
  `https://placehold.co/800x600/1a1d24/dddddd?text=${encodeURIComponent(label)}`;

async function main() {
  console.log("Cleaning existing data…");
  await prisma.$transaction([
    prisma.leadActivity.deleteMany(),
    prisma.drawingComment.deleteMany(),
    prisma.drawingVersion.deleteMany(),
    prisma.drawing.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.siteIssue.deleteMany(),
    prisma.siteUpdate.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.client.deleteMany(),
    prisma.user.deleteMany(),
    prisma.firm.deleteMany(),
  ]);

  // ── Firm ──────────────────────────────────────────────────────
  console.log("Creating firm…");
  const firm = await prisma.firm.create({
    data: {
      name: "DesignCraft Studios",
      email: "hello@designcraft.in",
      phone: "9876543210",
      gstNumber: "29AABCD1234E1Z5",
      address: "2nd Floor, Kalburgi Complex, Deshpande Nagar",
      city: "Hubbali",
      state: "Karnataka",
      brandColor: "#E8A045",
      website: "https://designcraft.in",
    },
  });

  // ── Users (all 5 roles) ───────────────────────────────────────
  console.log("Creating users (5 roles)…");
  const owner = await prisma.user.create({
    data: {
      clerkId: OWNER_CLERK_ID,
      firmId: firm.id,
      name: "Arjun Deshpande",
      email: "arjun@designcraft.in",
      phone: "9876543210",
      role: UserRole.OWNER,
    },
  });

  const architect = await prisma.user.create({
    data: {
      clerkId: "demo_architect_clerk_id",
      firmId: firm.id,
      name: "Priya Naik",
      email: "priya@designcraft.in",
      phone: "9845098123",
      role: UserRole.ARCHITECT,
    },
  });

  const draftsman = await prisma.user.create({
    data: {
      clerkId: "demo_draftsman_clerk_id",
      firmId: firm.id,
      name: "Anil Bijapur",
      email: "anil@designcraft.in",
      phone: "9741001234",
      role: UserRole.DRAFTSMAN,
    },
  });

  const siteManager = await prisma.user.create({
    data: {
      clerkId: "demo_sitemanager_clerk_id",
      firmId: firm.id,
      name: "Ramesh Gowda",
      email: "ramesh@designcraft.in",
      phone: "9900334455",
      role: UserRole.SITE_MANAGER,
    },
  });

  const admin = await prisma.user.create({
    data: {
      clerkId: "demo_admin_clerk_id",
      firmId: firm.id,
      name: "Sneha Kulkarni",
      email: "sneha@designcraft.in",
      phone: "9880556677",
      role: UserRole.ADMIN,
    },
  });

  const allUsers = [owner, architect, draftsman, siteManager, admin];

  // ── Clients ───────────────────────────────────────────────────
  console.log("Creating clients…");
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Rajesh Kulkarni",
        phone: "9845012345",
        email: "rajesh.kulkarni@gmail.com",
        address: "Plot 12, Gokul Road",
        city: "Hubbali",
        notes: "Prefers WhatsApp for updates. Long-term client.",
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Lakshmi Hegde",
        phone: "9900298765",
        email: "lakshmi.hegde@yahoo.in",
        address: "Near BVB College, Vidyanagar",
        city: "Hubbali",
        notes: "Very detail-oriented. Likes regular photo updates.",
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Vikram Patil",
        phone: "9741234567",
        email: "vikram.patil@outlook.com",
        address: "Unkal Lake Road",
        city: "Hubbali",
        notes: "NRI client — prefers email & portal link.",
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Dr. Ananya Bhat",
        phone: "9988776655",
        email: "ananya.bhat@gmail.com",
        address: "Keshwapur Main Road",
        city: "Hubbali",
        notes: "Dental clinic project. Available after 6 PM only.",
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Siddharth Nadiger",
        phone: "9880123456",
        address: "Sadhankeri, Dharwad",
        city: "Dharwad",
        notes: "Weekend meetings only. Retail showroom chain.",
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Meera Joshi",
        phone: "9845098765",
        email: "meera.joshi@gmail.com",
        address: "B-403, Shree Residency, Navanagar",
        city: "Hubbali",
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Naveen Hosamani",
        phone: "9743567890",
        email: "naveen.h@gmail.com",
        address: "CBT Layout, Vidyanagar",
        city: "Hubbali",
        notes: "Referred by Rajesh Kulkarni.",
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Savita Desai",
        phone: "9886012345",
        email: "savita.desai@rediffmail.com",
        address: "KHB Colony, Navanagar",
        city: "Hubbali",
      },
    }),
  ]);

  const [c0, c1, c2, c3, c4, c5, c6, c7] = clients;

  // ── Projects (all types, various stages) ──────────────────────
  console.log("Creating projects…");
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        firmId: firm.id, clientId: c0.id,
        name: "Kulkarni Residence — Gokul Road",
        description: "G+1 independent house with courtyard and car parking.",
        type: ProjectType.RESIDENTIAL, stage: ProjectStage.WORKING_DRAWINGS, status: ProjectStatus.ACTIVE,
        budget: 2800000, area: 1850, location: "Gokul Road, Hubbali",
        startDate: new Date("2024-10-15"), deadline: new Date("2026-03-31"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id, clientId: c1.id,
        name: "Hegde Villa — Vidyanagar",
        description: "Premium G+2 villa with terrace garden and rainwater harvesting.",
        type: ProjectType.RESIDENTIAL, stage: ProjectStage.DESIGN_DEV, status: ProjectStatus.ACTIVE,
        budget: 4500000, area: 2400, location: "Vidyanagar, Hubbali",
        startDate: new Date("2024-09-01"), deadline: new Date("2026-06-30"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id, clientId: c2.id,
        name: "Patil Farmhouse — Unkal",
        description: "Weekend retreat with pool, landscaped gardens, and open-to-sky bathrooms.",
        type: ProjectType.RESIDENTIAL, stage: ProjectStage.EXECUTION, status: ProjectStatus.ACTIVE,
        budget: 6200000, area: 3200, location: "Unkal Lake periphery, Hubbali",
        startDate: new Date("2024-04-10"), deadline: new Date("2025-12-15"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id, clientId: c3.id,
        name: "Bhat Dental Clinic — Keshwapur",
        description: "Modern dental clinic with 4 operatories, X-ray room, and patient lounge.",
        type: ProjectType.COMMERCIAL, stage: ProjectStage.SCHEMATIC, status: ProjectStatus.ACTIVE,
        budget: 8500000, area: 2100, location: "Keshwapur Main Road, Hubbali",
        startDate: new Date("2025-02-01"), deadline: new Date("2026-02-28"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id, clientId: c4.id,
        name: "Nadiger Retail Showroom — Dharwad",
        description: "2-storey electronics showroom with mezzanine display and service centre.",
        type: ProjectType.COMMERCIAL, stage: ProjectStage.EXECUTION, status: ProjectStatus.ACTIVE,
        budget: 12000000, area: 4800, location: "Sadhankeri, Dharwad",
        startDate: new Date("2024-11-01"), deadline: new Date("2025-11-30"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id, clientId: c5.id,
        name: "Joshi Apartment Interiors — Navanagar",
        description: "Full 3BHK interior fit-out: false ceiling, modular kitchen, wardrobes, bathroom renovation.",
        type: ProjectType.INTERIOR, stage: ProjectStage.EXECUTION, status: ProjectStatus.ACTIVE,
        budget: 1850000, area: 1450, location: "Navanagar, Hubbali",
        startDate: new Date("2025-03-01"), deadline: new Date("2025-09-30"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id, clientId: c0.id,
        name: "Vidya Niketan School Extension",
        description: "New classroom block + library wing for 400 additional students.",
        type: ProjectType.INSTITUTIONAL, stage: ProjectStage.SCHEMATIC, status: ProjectStatus.ACTIVE,
        budget: 18500000, area: 4800, location: "Old Hubbali",
        startDate: new Date("2024-08-15"), deadline: new Date("2026-12-31"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id, clientId: c1.id,
        name: "Hegde Garden & Driveway — Vidyanagar",
        description: "Landscape design with native plantings, paver driveway, and garden lighting.",
        type: ProjectType.LANDSCAPE, stage: ProjectStage.COMPLETED, status: ProjectStatus.COMPLETED,
        budget: 1650000, area: 4200, location: "Vidyanagar, Hubbali",
        startDate: new Date("2024-03-01"), deadline: new Date("2025-01-20"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id, clientId: c6.id,
        name: "Hosamani Warehouse — Industrial Area",
        description: "Pre-engineered steel warehouse with loading dock and office block.",
        type: ProjectType.INDUSTRIAL, stage: ProjectStage.CONCEPT, status: ProjectStatus.ACTIVE,
        budget: 9500000, area: 5000, location: "Industrial Estate, Hubbali",
        startDate: new Date("2025-03-20"), deadline: new Date("2026-09-30"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id, clientId: c7.id,
        name: "Desai Row Houses — Phase 1",
        description: "6-unit row house development, stilt + 2 floors, individual parking.",
        type: ProjectType.RESIDENTIAL, stage: ProjectStage.CONCEPT, status: ProjectStatus.ON_HOLD,
        budget: 20000000, area: 4500, location: "KHB Colony, Navanagar",
        startDate: new Date("2025-01-10"), deadline: new Date("2027-06-30"),
      },
    }),
  ]);

  const [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9] = projects;

  // ── Team assignments (different roles on different projects) ──
  console.log("Assigning team members…");
  await prisma.projectMember.createMany({
    data: [
      { projectId: p0.id, userId: owner.id, role: "Lead Architect" },
      { projectId: p0.id, userId: draftsman.id, role: "Draftsman" },
      { projectId: p0.id, userId: siteManager.id, role: "Site Coordinator" },

      { projectId: p1.id, userId: architect.id, role: "Lead Architect" },
      { projectId: p1.id, userId: draftsman.id, role: "Draftsman" },
      { projectId: p1.id, userId: owner.id, role: "Design Reviewer" },

      { projectId: p2.id, userId: owner.id, role: "Lead Architect" },
      { projectId: p2.id, userId: siteManager.id, role: "Site Manager" },
      { projectId: p2.id, userId: architect.id, role: "Design Support" },

      { projectId: p3.id, userId: architect.id, role: "Lead Architect" },
      { projectId: p3.id, userId: draftsman.id, role: "Draftsman" },

      { projectId: p4.id, userId: owner.id, role: "Principal Architect" },
      { projectId: p4.id, userId: architect.id, role: "Project Architect" },
      { projectId: p4.id, userId: siteManager.id, role: "Site Manager" },
      { projectId: p4.id, userId: draftsman.id, role: "Draftsman" },

      { projectId: p5.id, userId: architect.id, role: "Interior Designer" },
      { projectId: p5.id, userId: siteManager.id, role: "Site Coordinator" },

      { projectId: p6.id, userId: owner.id, role: "Lead Architect" },
      { projectId: p6.id, userId: architect.id, role: "Project Architect" },

      { projectId: p7.id, userId: architect.id, role: "Landscape Architect" },

      { projectId: p8.id, userId: owner.id, role: "Lead Architect" },

      { projectId: p9.id, userId: owner.id, role: "Lead Architect" },
      { projectId: p9.id, userId: architect.id, role: "Design Support" },
    ],
  });

  // ── Milestones (18 across projects, varied statuses) ──────────
  console.log("Creating milestones…");
  const milestoneRows = [
    { projectId: p0.id, name: "Concept Design Fee", stage: ProjectStage.CONCEPT, amount: 150000, gstPercent: 18, dueDate: new Date("2025-01-31"), status: MilestoneStatus.PAID, paidAt: new Date("2025-01-28"), paidAmount: 177000 },
    { projectId: p0.id, name: "Schematic Design Fee", stage: ProjectStage.SCHEMATIC, amount: 200000, gstPercent: 18, dueDate: new Date("2025-04-15"), status: MilestoneStatus.PAID, paidAt: new Date("2025-04-10"), paidAmount: 236000 },
    { projectId: p0.id, name: "Working Drawings Package", stage: ProjectStage.WORKING_DRAWINGS, amount: 350000, gstPercent: 18, dueDate: new Date("2025-08-01"), status: MilestoneStatus.DUE },
    { projectId: p1.id, name: "Site Analysis & Brief", stage: ProjectStage.CONCEPT, amount: 80000, gstPercent: 18, dueDate: new Date("2024-10-01"), status: MilestoneStatus.PAID, paidAt: new Date("2024-09-28"), paidAmount: 94400 },
    { projectId: p1.id, name: "Schematic Design", stage: ProjectStage.SCHEMATIC, amount: 220000, gstPercent: 18, dueDate: new Date("2025-01-10"), status: MilestoneStatus.PAID, paidAt: new Date("2025-01-08"), paidAmount: 259600 },
    { projectId: p1.id, name: "Design Development", stage: ProjectStage.DESIGN_DEV, amount: 280000, gstPercent: 18, dueDate: new Date("2025-06-30"), status: MilestoneStatus.UNPAID },
    { projectId: p2.id, name: "GFC & Statutory Drawings", stage: ProjectStage.WORKING_DRAWINGS, amount: 400000, gstPercent: 18, dueDate: new Date("2024-08-01"), status: MilestoneStatus.PAID, paidAt: new Date("2024-07-25"), paidAmount: 472000 },
    { projectId: p2.id, name: "Site Coordination — Phase 1", stage: ProjectStage.EXECUTION, amount: 180000, gstPercent: 18, dueDate: new Date("2024-12-01"), status: MilestoneStatus.OVERDUE },
    { projectId: p2.id, name: "Site Coordination — Phase 2", stage: ProjectStage.EXECUTION, amount: 180000, gstPercent: 18, dueDate: new Date("2025-06-30"), status: MilestoneStatus.UPCOMING },
    { projectId: p3.id, name: "Concept & Zoning Layout", stage: ProjectStage.CONCEPT, amount: 120000, gstPercent: 18, dueDate: new Date("2025-03-15"), status: MilestoneStatus.PAID, paidAt: new Date("2025-03-12"), paidAmount: 141600 },
    { projectId: p3.id, name: "Schematic Design", stage: ProjectStage.SCHEMATIC, amount: 450000, gstPercent: 18, dueDate: new Date("2025-07-01"), status: MilestoneStatus.DUE },
    { projectId: p4.id, name: "Schematic Design", stage: ProjectStage.SCHEMATIC, amount: 600000, gstPercent: 18, dueDate: new Date("2025-01-31"), status: MilestoneStatus.PAID, paidAt: new Date("2025-01-29"), paidAmount: 708000 },
    { projectId: p4.id, name: "Working Drawings & MEP", stage: ProjectStage.WORKING_DRAWINGS, amount: 900000, gstPercent: 18, dueDate: new Date("2025-05-15"), status: MilestoneStatus.PAID, paidAt: new Date("2025-05-14"), paidAmount: 1062000 },
    { projectId: p4.id, name: "Execution Supervision — Q1", stage: ProjectStage.EXECUTION, amount: 350000, gstPercent: 18, dueDate: new Date("2025-09-30"), status: MilestoneStatus.DUE },
    { projectId: p5.id, name: "Mood Boards & BOQ", stage: ProjectStage.DESIGN_DEV, amount: 95000, gstPercent: 18, dueDate: new Date("2025-03-20"), status: MilestoneStatus.PAID, paidAt: new Date("2025-03-18"), paidAmount: 112100 },
    { projectId: p5.id, name: "Execution Drawings & Site", stage: ProjectStage.EXECUTION, amount: 140000, gstPercent: 18, dueDate: new Date("2025-07-01"), status: MilestoneStatus.UNPAID },
    { projectId: p6.id, name: "Preliminary Design & Estimates", stage: ProjectStage.SCHEMATIC, amount: 950000, gstPercent: 18, dueDate: new Date("2025-06-30"), status: MilestoneStatus.UPCOMING },
    { projectId: p7.id, name: "Landscape Concept & Planting Plan", stage: ProjectStage.CONCEPT, amount: 85000, gstPercent: 18, dueDate: new Date("2024-05-01"), status: MilestoneStatus.PAID, paidAt: new Date("2024-04-28"), paidAmount: 100300 },
    { projectId: p7.id, name: "Execution & Plantation Supervision", stage: ProjectStage.EXECUTION, amount: 120000, gstPercent: 18, dueDate: new Date("2024-11-30"), status: MilestoneStatus.PAID, paidAt: new Date("2024-12-02"), paidAmount: 141600 },
    { projectId: p8.id, name: "Concept Design & Feasibility", stage: ProjectStage.CONCEPT, amount: 250000, gstPercent: 18, dueDate: new Date("2025-05-15"), status: MilestoneStatus.DUE },
  ];

  const milestones = await Promise.all(
    milestoneRows.map((m) =>
      prisma.milestone.create({
        data: {
          projectId: m.projectId, name: m.name, stage: m.stage, amount: m.amount,
          gstPercent: m.gstPercent, dueDate: m.dueDate, status: m.status,
          paidAt: m.paidAt, paidAmount: m.paidAmount,
        },
      })
    )
  );

  // ── Invoices (8 — mix of paid, unpaid, draft) ─────────────────
  console.log("Creating invoices…");
  const gst = (base: number, pct: number) => {
    const g = Math.round((base * pct) / 100);
    return { baseAmount: base, gstAmount: g, totalAmount: base + g };
  };

  const invoiceSpecs = [
    { mi: 0, no: "DCS-2025-001", status: InvoiceStatus.PAID, paidAt: new Date("2025-01-28") },
    { mi: 1, no: "DCS-2025-002", status: InvoiceStatus.PAID, paidAt: new Date("2025-04-10") },
    { mi: 3, no: "DCS-2024-089", status: InvoiceStatus.PAID, paidAt: new Date("2024-09-28") },
    { mi: 4, no: "DCS-2025-012", status: InvoiceStatus.PAID, paidAt: new Date("2025-01-08") },
    { mi: 6, no: "DCS-2024-056", status: InvoiceStatus.PAID, paidAt: new Date("2024-07-25") },
    { mi: 9, no: "DCS-2025-034", status: InvoiceStatus.PAID, paidAt: new Date("2025-03-12") },
    { mi: 11, no: "DCS-2025-045", status: InvoiceStatus.PAID, paidAt: new Date("2025-01-29") },
    { mi: 12, no: "DCS-2025-058", status: InvoiceStatus.PAID, paidAt: new Date("2025-05-14") },
    { mi: 14, no: "DCS-2025-067", status: InvoiceStatus.PAID, paidAt: new Date("2025-03-18") },
    { mi: 17, no: "DCS-2024-042", status: InvoiceStatus.PAID, paidAt: new Date("2024-04-28") },
    { mi: 18, no: "DCS-2024-078", status: InvoiceStatus.PAID, paidAt: new Date("2024-12-02") },
    { mi: 5, no: "DCS-2025-071", status: InvoiceStatus.UNPAID, notes: "Payment due within 15 days." },
    { mi: 7, no: "DCS-2025-030", status: InvoiceStatus.OVERDUE, notes: "2 reminders sent. Client requested extension." },
    { mi: 19, no: "DCS-2025-079", status: InvoiceStatus.DRAFT, notes: "Awaiting Arjun's approval before sending." },
  ];

  for (const spec of invoiceSpecs) {
    const ms = milestones[spec.mi];
    const amounts = gst(ms.amount, ms.gstPercent);
    await prisma.invoice.create({
      data: {
        milestoneId: ms.id, invoiceNo: spec.no,
        ...amounts, status: spec.status,
        paidAt: "paidAt" in spec ? (spec as { paidAt: Date }).paidAt : undefined,
        notes: "notes" in spec ? (spec as { notes: string }).notes : undefined,
      },
    });
  }

  // ── Drawings (12 with versions & comments) ────────────────────
  console.log("Creating drawings & comments…");
  const drawingSpecs = [
    { projectId: p0.id, name: "Ground Floor Plan", type: DrawingType.PLAN, status: DrawingStatus.APPROVED, version: 3, fileSize: 1_240_000 },
    { projectId: p0.id, name: "First Floor Plan", type: DrawingType.PLAN, status: DrawingStatus.APPROVED, version: 2, fileSize: 980_000 },
    { projectId: p0.id, name: "Front Elevation", type: DrawingType.ELEVATION, status: DrawingStatus.PENDING_REVIEW, version: 1, fileSize: 1_800_000 },
    { projectId: p1.id, name: "3D Exterior Render", type: DrawingType.RENDER, status: DrawingStatus.APPROVED, version: 2, fileSize: 4_200_000 },
    { projectId: p1.id, name: "Section A–A", type: DrawingType.SECTION, status: DrawingStatus.REVISION_REQUESTED, version: 2, fileSize: 1_560_000 },
    { projectId: p2.id, name: "Foundation Detail", type: DrawingType.DETAIL, status: DrawingStatus.APPROVED, version: 1, fileSize: 890_000 },
    { projectId: p2.id, name: "Pool & Deck Layout", type: DrawingType.PLAN, status: DrawingStatus.PENDING_REVIEW, version: 1, fileSize: 1_120_000 },
    { projectId: p3.id, name: "Clinic Floor Plan — Proposed", type: DrawingType.PLAN, status: DrawingStatus.PENDING_REVIEW, version: 1, fileSize: 1_350_000 },
    { projectId: p4.id, name: "Structural Grid & Columns", type: DrawingType.DETAIL, status: DrawingStatus.APPROVED, version: 1, fileSize: 920_000 },
    { projectId: p4.id, name: "Electrical Layout — GF", type: DrawingType.DETAIL, status: DrawingStatus.APPROVED, version: 2, fileSize: 780_000 },
    { projectId: p5.id, name: "Living-Dining 3D Render", type: DrawingType.RENDER, status: DrawingStatus.APPROVED, version: 2, fileSize: 5_100_000 },
    { projectId: p6.id, name: "Site Plan & Parking Layout", type: DrawingType.PLAN, status: DrawingStatus.PENDING_REVIEW, version: 1, fileSize: 1_450_000 },
  ];

  const drawings = [];
  for (const d of drawingSpecs) {
    const slug = d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const drawing = await prisma.drawing.create({
      data: {
        projectId: d.projectId, name: d.name, type: d.type,
        fileUrl: placeholderDrawing(d.name), fileSize: d.fileSize,
        mimeType: "application/pdf", version: d.version, status: d.status,
        uploadedById: draftsman.id,
      },
    });
    drawings.push(drawing);

    for (let v = 1; v <= d.version; v++) {
      await prisma.drawingVersion.create({
        data: {
          drawingId: drawing.id, version: v,
          fileUrl: placeholderDrawing(`${slug}-v${v}`), fileSize: d.fileSize,
          note: v === 1 ? "Initial upload" : `Revision ${v} — ${v === d.version && d.status === "REVISION_REQUESTED" ? "client feedback pending" : "incorporated review comments"}`,
        },
      });
    }
  }

  // Drawing comments — team + client
  const commentData = [
    { drawingIdx: 0, userId: owner.id, content: "Approved. Good work on the staircase detailing." },
    { drawingIdx: 0, userId: architect.id, content: "Kitchen counter depth needs correction — should be 600mm not 450mm." },
    { drawingIdx: 0, clientName: "Rajesh Kulkarni", content: "Can we add a shoe rack near the entrance? Otherwise looks perfect.", isClient: true },
    { drawingIdx: 1, userId: owner.id, content: "Bedroom 2 window size increased as discussed. Approved." },
    { drawingIdx: 1, clientName: "Rajesh Kulkarni", content: "Thank you! One question — is the terrace access from bedroom 1 or the staircase?", isClient: true },
    { drawingIdx: 3, userId: owner.id, content: "Beautiful render. Send to client for approval." },
    { drawingIdx: 3, clientName: "Lakshmi Hegde", content: "Love the stone cladding! Can we see an option with grey tiles instead?", isClient: true },
    { drawingIdx: 4, userId: architect.id, content: "Staircase headroom is 2.0m — needs to be minimum 2.2m per NBC." },
    { drawingIdx: 4, userId: draftsman.id, content: "Will revise and resubmit by Friday." },
    { drawingIdx: 7, userId: architect.id, content: "Check sterilisation room placement — AERB guidelines require specific shielding." },
    { drawingIdx: 7, clientName: "Dr. Ananya Bhat", content: "Please add a separate staff entrance from the side. Also the waiting area feels small.", isClient: true },
    { drawingIdx: 10, userId: architect.id, content: "Client loved this. Proceed with false ceiling shop drawings." },
    { drawingIdx: 10, clientName: "Meera Joshi", content: "Can the TV wall be darker? Maybe charcoal grey. Rest is exactly what I wanted!", isClient: true },
  ];

  for (const c of commentData) {
    await prisma.drawingComment.create({
      data: {
        drawingId: drawings[c.drawingIdx].id,
        userId: c.isClient ? null : c.userId,
        clientName: c.isClient ? c.clientName : null,
        content: c.content,
        isClient: !!c.isClient,
      },
    });
  }

  // ── Site Updates (10 with photos) ─────────────────────────────
  console.log("Creating site updates…");
  await prisma.siteUpdate.createMany({
    data: [
      { projectId: p2.id, userId: siteManager.id, note: "First floor slab casting completed. Curing started — will continue for 14 days.", photos: [placeholderPhoto("Slab casting"), placeholderPhoto("Curing water")], milestone: ProjectStage.EXECUTION, weather: "Clear, 34°C" },
      { projectId: p2.id, userId: siteManager.id, note: "Brickwork on ground floor 80% done. Lintel beams poured today.", photos: [placeholderPhoto("Brickwork progress"), placeholderPhoto("Lintel beam")], milestone: ProjectStage.EXECUTION, weather: "Partly cloudy, 30°C" },
      { projectId: p2.id, userId: owner.id, note: "Client visited site. Happy with progress. Requested change in guest bathroom tile layout.", photos: [placeholderPhoto("Client site visit")], milestone: ProjectStage.EXECUTION, weather: "Clear, 32°C" },
      { projectId: p4.id, userId: siteManager.id, note: "Column casting for ground floor completed. Steel for first floor being tied.", photos: [placeholderPhoto("Column casting"), placeholderPhoto("Steel binding"), placeholderPhoto("Formwork")], milestone: ProjectStage.EXECUTION, weather: "Sunny, 36°C" },
      { projectId: p4.id, userId: siteManager.id, note: "Electrical conduit laying in progress — coordination with MEP consultant done.", photos: [placeholderPhoto("Conduit laying")], milestone: ProjectStage.EXECUTION },
      { projectId: p5.id, userId: siteManager.id, note: "False ceiling framework installed in living room. POP work starting tomorrow.", photos: [placeholderPhoto("Ceiling framework"), placeholderPhoto("Framework detail")], milestone: ProjectStage.EXECUTION, weather: "Overcast, 28°C" },
      { projectId: p5.id, userId: architect.id, note: "Modular kitchen carcass delivered. Checking dimensions against drawings.", photos: [placeholderPhoto("Kitchen carcass")], milestone: ProjectStage.EXECUTION },
      { projectId: p1.id, userId: architect.id, note: "Client walkthrough of schematic 3D model — minor façade adjustments requested for parapet height.", photos: [], milestone: ProjectStage.DESIGN_DEV },
      { projectId: p3.id, userId: architect.id, note: "Municipal setback verification visit. Awaiting NOC copy from client for plan submission.", photos: [placeholderPhoto("Site measurement")], milestone: ProjectStage.SCHEMATIC },
      { projectId: p0.id, userId: draftsman.id, note: "Working drawings for GF structure being prepared. Will share draft by end of week.", photos: [], milestone: ProjectStage.WORKING_DRAWINGS },
    ],
  });

  // ── Site Issues (6 with varied severities) ────────────────────
  console.log("Creating site issues…");
  await prisma.siteIssue.createMany({
    data: [
      { projectId: p2.id, title: "Water seepage in basement wall", description: "Seepage noticed along the east basement wall after recent rainfall. Needs waterproofing treatment before plastering.", photos: [placeholderPhoto("Seepage")], severity: IssueSeverity.HIGH, status: IssueStatus.OPEN, assignedTo: "Ramesh Gowda" },
      { projectId: p2.id, title: "Steel delivery delayed by 5 days", description: "8mm TMT bars not available locally. Supplier says 5 working days lead time.", severity: IssueSeverity.MEDIUM, status: IssueStatus.IN_PROGRESS, assignedTo: "North Karnataka Steel Traders" },
      { projectId: p4.id, title: "Column alignment off by 15mm", description: "Column C4 is 15mm off-grid. Structural consultant says acceptable but needs monitoring.", severity: IssueSeverity.MEDIUM, status: IssueStatus.RESOLVED, assignedTo: "Ramesh Gowda", resolvedAt: new Date("2025-03-15") },
      { projectId: p5.id, title: "Wrong tile shade delivered", description: "Bathroom tiles are 'Ivory Beige' instead of 'Pearl White'. Replacement ordered.", severity: IssueSeverity.LOW, status: IssueStatus.RESOLVED, assignedTo: "Karnataka Tile House", resolvedAt: new Date("2025-03-20") },
      { projectId: p4.id, title: "Neighbours complaint about noise", description: "Adjacent shop owner complained about drilling noise during business hours. Agreed to limit heavy work to before 10 AM and after 6 PM.", severity: IssueSeverity.LOW, status: IssueStatus.CLOSED, assignedTo: "Ramesh Gowda", resolvedAt: new Date("2025-03-10") },
      { projectId: p2.id, title: "Concrete quality test failure", description: "7-day cube test for first floor slab showed 18 MPa instead of required 25 MPa. Re-testing at 28 days. If still below, structural consultant to advise.", severity: IssueSeverity.CRITICAL, status: IssueStatus.OPEN, assignedTo: "Arjun Deshpande" },
    ],
  });

  // ── Leads (12 across all stages & sources) ────────────────────
  console.log("Creating leads…");
  const leads = await Promise.all([
    prisma.lead.create({ data: { firmId: firm.id, name: "Prakash Sutar", phone: "9900112233", email: "prakash.sutar@gmail.com", projectType: ProjectType.RESIDENTIAL, budget: 3200000, area: 1600, source: LeadSource.INSTAGRAM, stage: LeadStage.NEW, notes: "Saw our Kulkarni Residence reel. Enquiry for duplex near Airport Road.", followUpAt: new Date("2025-04-02") } }),
    prisma.lead.create({ data: { firmId: firm.id, name: "Divya Kamat", phone: "9844788990", projectType: ProjectType.INTERIOR, budget: 1200000, area: 1100, source: LeadSource.WEBSITE, stage: LeadStage.CONTACTED, followUpAt: new Date("2025-03-28") } }),
    prisma.lead.create({ data: { firmId: firm.id, name: "Ravi Moorgeri", phone: "9742001122", projectType: ProjectType.COMMERCIAL, budget: 15000000, area: 6000, source: LeadSource.REFERRAL, stage: LeadStage.SITE_VISIT, notes: "Referred by Shree Basaveshwara Contractors — café + co-working space.", followUpAt: new Date("2025-03-30") } }),
    prisma.lead.create({ data: { firmId: firm.id, name: "Sneha Mannur", phone: "9886677544", email: "sneha.mannur@yahoo.in", projectType: ProjectType.RESIDENTIAL, budget: 5500000, area: 2800, source: LeadSource.PHONE, stage: LeadStage.PROPOSAL_SENT } }),
    prisma.lead.create({ data: { firmId: firm.id, name: "Kiran Badiger", phone: "9986054321", projectType: ProjectType.LANDSCAPE, budget: 650000, area: 3000, source: LeadSource.WALKIN, stage: LeadStage.NEGOTIATION, address: "Deshpande Nagar", notes: "Budget is tight. Discussing phased execution." } }),
    prisma.lead.create({ data: { firmId: firm.id, name: "Nethra Gouda", phone: "9845566778", projectType: ProjectType.INSTITUTIONAL, budget: 22000000, area: 15000, source: LeadSource.HOUZZ, stage: LeadStage.WON, notes: "Formal agreement signed — NGO learning centre in Dharwad." } }),
    prisma.lead.create({ data: { firmId: firm.id, name: "Manoj Hiremath", phone: "9901234987", projectType: ProjectType.RESIDENTIAL, budget: 1800000, area: 900, source: LeadSource.FACEBOOK, stage: LeadStage.LOST, notes: "Went with a packaged builder. Price-sensitive." } }),
    prisma.lead.create({ data: { firmId: firm.id, name: "Pallavi Shirur", phone: "9743120987", email: "pallavi.shirur@gmail.com", projectType: ProjectType.INTERIOR, budget: 950000, area: 1250, source: LeadSource.OTHER, stage: LeadStage.NEW, notes: "Apartment turnkey — Navanagar. Referred by Meera Joshi." } }),
    prisma.lead.create({ data: { firmId: firm.id, name: "Basavaraj Angadi", phone: "9887766554", projectType: ProjectType.COMMERCIAL, budget: 7800000, area: 3500, source: LeadSource.WEBSITE, stage: LeadStage.CONTACTED, followUpAt: new Date("2025-04-05") } }),
    prisma.lead.create({ data: { firmId: firm.id, name: "Shweta Toravi", phone: "9845011199", projectType: ProjectType.RESIDENTIAL, budget: 4100000, area: 1950, source: LeadSource.REFERRAL, stage: LeadStage.SITE_VISIT, notes: "Referred by Dr. Ananya Bhat." } }),
    prisma.lead.create({ data: { firmId: firm.id, name: "Arun Hosalli", phone: "9900445566", email: "arun.hosalli@gmail.com", projectType: ProjectType.INDUSTRIAL, budget: 11000000, area: 8000, source: LeadSource.PHONE, stage: LeadStage.PROPOSAL_SENT, notes: "Cold storage facility. Needs specialised insulation consultant." } }),
    prisma.lead.create({ data: { firmId: firm.id, name: "Deepa Gadag", phone: "9741998877", projectType: ProjectType.RESIDENTIAL, budget: 2700000, area: 1400, source: LeadSource.INSTAGRAM, stage: LeadStage.NEW, notes: "DM on Instagram. Interested in compact modern homes." } }),
  ]);

  // ── Lead Activities (15 showing full workflow) ────────────────
  console.log("Creating lead activities…");
  await prisma.leadActivity.createMany({
    data: [
      { leadId: leads[0].id, userId: owner.id, type: ActivityType.WHATSAPP, note: "Sent portfolio PDF and fee structure." },
      { leadId: leads[0].id, userId: admin.id, type: ActivityType.NOTE, note: "Follow-up scheduled for 2 April." },
      { leadId: leads[1].id, userId: architect.id, type: ActivityType.CALL, note: "Initial call — discussed 3BHK interior scope and timeline. Wants start post-monsoon." },
      { leadId: leads[1].id, userId: architect.id, type: ActivityType.EMAIL, note: "Sent sample mood boards and rough BOQ." },
      { leadId: leads[2].id, userId: owner.id, type: ActivityType.SITE_VISIT, note: "Visited plot with Ravi. Measured 60×100 ft. Shared preliminary FAR notes." },
      { leadId: leads[2].id, userId: owner.id, type: ActivityType.PROPOSAL, note: "Sent detailed proposal: café 2000 sqft + co-working 4000 sqft. Fee: ₹12L." },
      { leadId: leads[3].id, userId: architect.id, type: ActivityType.SITE_VISIT, note: "Visited site in Gokul Road extension. Corner plot, good orientation." },
      { leadId: leads[3].id, userId: owner.id, type: ActivityType.PROPOSAL, note: "Proposal sent: G+1, ₹55L budget, 8% fee. Awaiting response." },
      { leadId: leads[4].id, userId: owner.id, type: ActivityType.CALL, note: "Negotiation call — client wants to phase the work. Phase 1: front garden only." },
      { leadId: leads[5].id, userId: owner.id, type: ActivityType.STAGE_CHANGE, note: "Lead marked as Won. Formal agreement signed for NGO learning centre." },
      { leadId: leads[6].id, userId: admin.id, type: ActivityType.STAGE_CHANGE, note: "Lead marked as Lost. Client chose packaged builder for lower cost." },
      { leadId: leads[8].id, userId: architect.id, type: ActivityType.CALL, note: "First call. Interested in showroom design. Will schedule site visit." },
      { leadId: leads[9].id, userId: owner.id, type: ActivityType.SITE_VISIT, note: "Visited plot. 30×40, east-facing. Good for G+1 with stilt parking." },
      { leadId: leads[10].id, userId: owner.id, type: ActivityType.PROPOSAL, note: "Cold storage proposal with Kingspan panel specification. ₹11Cr budget." },
      { leadId: leads[11].id, userId: admin.id, type: ActivityType.WHATSAPP, note: "Responded to Instagram DM. Shared project photos and consultation booking link." },
    ],
  });

  // ── Vendors (8 across categories) ─────────────────────────────
  console.log("Creating vendors…");
  await prisma.vendor.createMany({
    data: [
      { firmId: firm.id, name: "Shree Basaveshwara Civil Contractors", category: VendorCategory.CONTRACTOR, phone: "9880123789", email: "basaveshwara.civil@gmail.com", address: "Gandhi Nagar, Old Hubbali", city: "Hubbali", gst: "29AABCS1234F1Z1", rating: 5, notes: "Go-to contractor. Strong RCC & masonry team. 20+ years experience." },
      { firmId: firm.id, name: "Karnataka Tile House", category: VendorCategory.TILES, phone: "8362234567", address: "Koppikar Road", city: "Hubbali", rating: 4, notes: "Full vitrified, ceramic, and sanitary display. Good prices." },
      { firmId: firm.id, name: "PowerLine Electricals", category: VendorCategory.ELECTRICAL, phone: "9845088899", email: "sales@powerline-hbl.in", address: "Deshpande Nagar", city: "Hubbali", gst: "29ABCDE5678G1Z2", rating: 4, notes: "Havells & Schneider authorised. Also does home automation." },
      { firmId: firm.id, name: "FlowRight Plumbing Solutions", category: VendorCategory.PLUMBING, phone: "9902468135", address: "Vidyanagar", city: "Hubbali", rating: 5, notes: "Best plumbing crew in Hubbali. Jaquar certified." },
      { firmId: firm.id, name: "ColourCraft Paints & Coatings", category: VendorCategory.PAINT, phone: "8362378901", address: "Gokul Road", city: "Hubbali", rating: 4, notes: "Asian Paints & Berger authorised dealer." },
      { firmId: firm.id, name: "North Karnataka Steel Traders", category: VendorCategory.STEEL, phone: "9880456123", email: "nksteel@yahoo.in", address: "Industrial Estate, Hubbali", city: "Hubbali", gst: "29STEEL0001H1Z5", rating: 4, notes: "TMT bars & structural steel. Same-day delivery within Hubbali." },
      { firmId: firm.id, name: "Dharwad Wood Works", category: VendorCategory.WOOD, phone: "9742089012", address: "PB Road", city: "Dharwad", rating: 5, notes: "Premium teak & sal wood. Custom door and window frames." },
      { firmId: firm.id, name: "Crystal Glass & Aluminium", category: VendorCategory.GLASS, phone: "9845033456", email: "crystalglass.hbl@gmail.com", address: "Navanagar Industrial Area", city: "Hubbali", gst: "29GLASS0002J1Z3", rating: 3, notes: "Good for standard work. Premium jobs need Belagavi supplier." },
    ],
  });

  // ── Summary ───────────────────────────────────────────────────
  console.log("\n=== Seed completed ===");
  console.log(`Firm:         ${firm.name}`);
  console.log(`Users:        ${allUsers.length} (${allUsers.map(u => u.role).join(", ")})`);
  console.log(`Clients:      ${clients.length}`);
  console.log(`Projects:     ${projects.length}`);
  console.log(`Milestones:   ${milestones.length}`);
  console.log(`Invoices:     ${invoiceSpecs.length}`);
  console.log(`Drawings:     ${drawingSpecs.length}`);
  console.log(`Leads:        ${leads.length}`);
  console.log(`Vendors:      8`);
  console.log(`Site Updates: 10`);
  console.log(`Site Issues:  6`);
  console.log(`Lead Activities: 15`);
  console.log(`Drawing Comments: ${commentData.length}`);
  console.log(`\nOwner Clerk ID: ${OWNER_CLERK_ID}`);
  if (OWNER_CLERK_ID === "demo_owner_clerk_id") {
    console.log("⚠  Using placeholder Clerk ID. To link to your account:");
    console.log("   OWNER_CLERK_ID=user_xxxx npm run db:seed");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
