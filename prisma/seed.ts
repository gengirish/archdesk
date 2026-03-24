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
} from "@prisma/client";

const prisma = new PrismaClient();

const placeholderDrawingUrl = (slug: string) =>
  `https://storage.archdesk.local/drawings/${slug}.pdf`;

async function main() {
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

  const owner = await prisma.user.create({
    data: {
      clerkId: "demo_clerk_id",
      firmId: firm.id,
      name: "Arjun Deshpande",
      email: "arjun@designcraft.in",
      phone: "9876543210",
      role: UserRole.OWNER,
    },
  });

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Rajesh Kulkarni",
        phone: "9845012345",
        email: "rajesh.kulkarni@gmail.com",
        address: "Plot 12, Gokul Road",
        city: "Hubbali",
        notes: "Prefers WhatsApp for updates.",
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
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Ananya Bhat",
        phone: "9988776655",
        email: "ananya.bhat@gmail.com",
        address: "Keshwapur",
        city: "Hubbali",
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Siddharth Nadiger",
        phone: "9880123456",
        address: "Dharwad — Sadhankeri",
        city: "Dharwad",
        notes: "Weekend meetings only.",
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id,
        name: "Meera Joshi",
        phone: "9845098765",
        email: "meera.joshi@gmail.com",
        address: "Navanagar",
        city: "Hubbali",
      },
    }),
  ]);

  const [c0, c1, c2, c3, c4, c5] = clients;

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        firmId: firm.id,
        clientId: c0.id,
        name: "Kulkarni Residence — Gokul Road",
        description: "G+1 independent house with courtyard.",
        type: ProjectType.RESIDENTIAL,
        stage: ProjectStage.CONCEPT,
        status: ProjectStatus.ACTIVE,
        budget: 2800000,
        area: 1850,
        location: "Gokul Road, Hubbali",
        startDate: new Date("2025-01-15"),
        deadline: new Date("2026-03-31"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id,
        clientId: c1.id,
        name: "Hegde Villa — Vidyanagar",
        type: ProjectType.RESIDENTIAL,
        stage: ProjectStage.SCHEMATIC,
        status: ProjectStatus.ACTIVE,
        budget: 4500000,
        area: 2400,
        location: "Vidyanagar, Hubbali",
        startDate: new Date("2024-09-01"),
        deadline: new Date("2026-06-30"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id,
        clientId: c2.id,
        name: "Patil Farmhouse — Unkal",
        type: ProjectType.RESIDENTIAL,
        stage: ProjectStage.EXECUTION,
        status: ProjectStatus.ACTIVE,
        budget: 6200000,
        area: 3200,
        location: "Unkal Lake periphery, Hubbali",
        startDate: new Date("2024-04-10"),
        deadline: new Date("2025-12-15"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id,
        clientId: c3.id,
        name: "Bhat Dental Clinic — Keshwapur",
        type: ProjectType.COMMERCIAL,
        stage: ProjectStage.DESIGN_DEV,
        status: ProjectStatus.ACTIVE,
        budget: 8500000,
        area: 2100,
        location: "Keshwapur, Hubbali",
        startDate: new Date("2025-02-01"),
        deadline: new Date("2026-02-28"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id,
        clientId: c4.id,
        name: "Nadiger Retail Showroom — Dharwad",
        type: ProjectType.COMMERCIAL,
        stage: ProjectStage.WORKING_DRAWINGS,
        status: ProjectStatus.ACTIVE,
        budget: 12000000,
        area: 4800,
        location: "Sadhankeri, Dharwad",
        startDate: new Date("2024-11-01"),
        deadline: new Date("2025-11-30"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id,
        clientId: c5.id,
        name: "Joshi Apartment Interiors — Navanagar",
        type: ProjectType.INTERIOR,
        stage: ProjectStage.EXECUTION,
        status: ProjectStatus.ACTIVE,
        budget: 1850000,
        area: 1450,
        location: "Navanagar, Hubbali",
        startDate: new Date("2025-03-01"),
        deadline: new Date("2025-09-30"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id,
        clientId: c0.id,
        name: "Vidya Niketan School Extension",
        type: ProjectType.INSTITUTIONAL,
        stage: ProjectStage.SCHEMATIC,
        status: ProjectStatus.ACTIVE,
        budget: 18500000,
        area: 4800,
        location: "Old Hubbali",
        startDate: new Date("2024-08-15"),
        deadline: new Date("2026-12-31"),
      },
    }),
    prisma.project.create({
      data: {
        firmId: firm.id,
        clientId: c1.id,
        name: "Hegde Garden & Driveway — Vidyanagar",
        type: ProjectType.LANDSCAPE,
        stage: ProjectStage.COMPLETED,
        status: ProjectStatus.COMPLETED,
        budget: 1650000,
        area: 4200,
        location: "Vidyanagar, Hubbali",
        startDate: new Date("2024-03-01"),
        deadline: new Date("2025-01-20"),
      },
    }),
  ]);

  const [p0, p1, p2, p3, p4, p5, p6, p7] = projects;

  await prisma.projectMember.createMany({
    data: projects.map((p) => ({
      projectId: p.id,
      userId: owner.id,
      role: "Lead Architect",
    })),
  });

  const milestoneRows: Array<{
    projectId: string;
    name: string;
    description?: string;
    stage: ProjectStage;
    amount: number;
    gstPercent: number;
    dueDate: Date | null;
    status: MilestoneStatus;
    paidAt?: Date;
    paidAmount?: number;
  }> = [
    {
      projectId: p0.id,
      name: "Concept Design",
      stage: ProjectStage.CONCEPT,
      amount: 150000,
      gstPercent: 18,
      dueDate: new Date("2025-02-28"),
      status: MilestoneStatus.PAID,
      paidAt: new Date("2025-02-20"),
      paidAmount: 177000,
    },
    {
      projectId: p0.id,
      name: "Schematic Design",
      stage: ProjectStage.SCHEMATIC,
      amount: 200000,
      gstPercent: 18,
      dueDate: new Date("2025-05-15"),
      status: MilestoneStatus.DUE,
    },
    {
      projectId: p0.id,
      name: "Working Drawings Package",
      stage: ProjectStage.WORKING_DRAWINGS,
      amount: 350000,
      gstPercent: 18,
      dueDate: new Date("2025-10-01"),
      status: MilestoneStatus.UPCOMING,
    },
    {
      projectId: p1.id,
      name: "Site Analysis & Brief",
      stage: ProjectStage.CONCEPT,
      amount: 80000,
      gstPercent: 18,
      dueDate: new Date("2024-10-01"),
      status: MilestoneStatus.PAID,
      paidAt: new Date("2024-09-28"),
      paidAmount: 94400,
    },
    {
      projectId: p1.id,
      name: "Schematic Design",
      stage: ProjectStage.SCHEMATIC,
      amount: 220000,
      gstPercent: 18,
      dueDate: new Date("2025-01-10"),
      status: MilestoneStatus.PAID,
      paidAt: new Date("2025-01-08"),
      paidAmount: 259600,
    },
    {
      projectId: p1.id,
      name: "Design Development",
      stage: ProjectStage.DESIGN_DEV,
      amount: 280000,
      gstPercent: 18,
      dueDate: new Date("2025-06-30"),
      status: MilestoneStatus.UNPAID,
    },
    {
      projectId: p2.id,
      name: "GFC & Statutory",
      stage: ProjectStage.WORKING_DRAWINGS,
      amount: 400000,
      gstPercent: 18,
      dueDate: new Date("2024-08-01"),
      status: MilestoneStatus.PAID,
      paidAt: new Date("2024-07-25"),
      paidAmount: 472000,
    },
    {
      projectId: p2.id,
      name: "Site Coordination — Phase 1",
      stage: ProjectStage.EXECUTION,
      amount: 180000,
      gstPercent: 18,
      dueDate: new Date("2024-12-01"),
      status: MilestoneStatus.OVERDUE,
    },
    {
      projectId: p2.id,
      name: "Site Coordination — Phase 2",
      stage: ProjectStage.EXECUTION,
      amount: 180000,
      gstPercent: 18,
      dueDate: new Date("2025-04-30"),
      status: MilestoneStatus.UPCOMING,
    },
    {
      projectId: p3.id,
      name: "Concept & Zoning",
      stage: ProjectStage.CONCEPT,
      amount: 120000,
      gstPercent: 18,
      dueDate: new Date("2025-03-15"),
      status: MilestoneStatus.DUE,
    },
    {
      projectId: p3.id,
      name: "Design Development",
      stage: ProjectStage.DESIGN_DEV,
      amount: 450000,
      gstPercent: 18,
      dueDate: new Date("2025-09-01"),
      status: MilestoneStatus.UPCOMING,
    },
    {
      projectId: p4.id,
      name: "Schematic Design",
      stage: ProjectStage.SCHEMATIC,
      amount: 600000,
      gstPercent: 18,
      dueDate: new Date("2025-01-31"),
      status: MilestoneStatus.PAID,
      paidAt: new Date("2025-01-29"),
      paidAmount: 708000,
    },
    {
      projectId: p4.id,
      name: "Working Drawings & MEP coordination",
      stage: ProjectStage.WORKING_DRAWINGS,
      amount: 900000,
      gstPercent: 18,
      dueDate: new Date("2025-07-15"),
      status: MilestoneStatus.DUE,
    },
    {
      projectId: p5.id,
      name: "Mood boards & BOQ",
      stage: ProjectStage.DESIGN_DEV,
      amount: 95000,
      gstPercent: 18,
      dueDate: new Date("2025-03-20"),
      status: MilestoneStatus.PAID,
      paidAt: new Date("2025-03-18"),
      paidAmount: 112100,
    },
    {
      projectId: p5.id,
      name: "Execution drawings & site visits",
      stage: ProjectStage.EXECUTION,
      amount: 140000,
      gstPercent: 18,
      dueDate: new Date("2025-07-01"),
      status: MilestoneStatus.UNPAID,
    },
    {
      projectId: p6.id,
      name: "Preliminary design & estimates",
      stage: ProjectStage.SCHEMATIC,
      amount: 950000,
      gstPercent: 18,
      dueDate: new Date("2025-02-28"),
      status: MilestoneStatus.UPCOMING,
    },
    {
      projectId: p7.id,
      name: "Landscape concept & planting plan",
      stage: ProjectStage.CONCEPT,
      amount: 85000,
      gstPercent: 18,
      dueDate: new Date("2024-05-01"),
      status: MilestoneStatus.PAID,
      paidAt: new Date("2024-04-28"),
      paidAmount: 100300,
    },
  ];

  const milestones = await Promise.all(
    milestoneRows.map((m) =>
      prisma.milestone.create({
        data: {
          projectId: m.projectId,
          name: m.name,
          description: m.description,
          stage: m.stage,
          amount: m.amount,
          gstPercent: m.gstPercent,
          dueDate: m.dueDate,
          status: m.status,
          paidAt: m.paidAt,
          paidAmount: m.paidAmount,
        },
      })
    )
  );

  const inv = (base: number, gst: number) => ({
    baseAmount: base,
    gstAmount: gst,
    totalAmount: base + gst,
  });

  const invoiceSpecs: Array<{
    milestoneIndex: number;
    invoiceNo: string;
    status: InvoiceStatus;
    paidAt?: Date;
  }> = [
    { milestoneIndex: 0, invoiceNo: "INV-2025-001", status: InvoiceStatus.PAID, paidAt: new Date("2025-02-20") },
    { milestoneIndex: 3, invoiceNo: "INV-2024-089", status: InvoiceStatus.PAID, paidAt: new Date("2024-09-28") },
    { milestoneIndex: 4, invoiceNo: "INV-2025-012", status: InvoiceStatus.PAID, paidAt: new Date("2025-01-08") },
    { milestoneIndex: 6, invoiceNo: "INV-2024-056", status: InvoiceStatus.PAID, paidAt: new Date("2024-07-25") },
    { milestoneIndex: 9, invoiceNo: "INV-2025-034", status: InvoiceStatus.UNPAID },
  ];

  for (const spec of invoiceSpecs) {
    const ms = milestones[spec.milestoneIndex];
    const gstAmt = (ms.amount * ms.gstPercent) / 100;
    const amounts = inv(ms.amount, gstAmt);
    await prisma.invoice.create({
      data: {
        milestoneId: ms.id,
        invoiceNo: spec.invoiceNo,
        baseAmount: amounts.baseAmount,
        gstAmount: amounts.gstAmount,
        totalAmount: amounts.totalAmount,
        status: spec.status,
        paidAt: spec.paidAt,
        notes: spec.status === InvoiceStatus.UNPAID ? "Payment due within 15 days of invoice date." : undefined,
      },
    });
  }

  const drawingSpecs: Array<{
    projectId: string;
    name: string;
    type: DrawingType;
    slug: string;
    status: DrawingStatus;
    version: number;
    fileSize: number;
  }> = [
    { projectId: p0.id, name: "Ground Floor Plan", type: DrawingType.PLAN, slug: "kulkarni-gf-plan", status: DrawingStatus.APPROVED, version: 2, fileSize: 1_240_000 },
    { projectId: p0.id, name: "First Floor Plan", type: DrawingType.PLAN, slug: "kulkarni-ff-plan", status: DrawingStatus.PENDING_REVIEW, version: 1, fileSize: 980_000 },
    { projectId: p1.id, name: "Front Elevation", type: DrawingType.ELEVATION, slug: "hegde-front-elevation", status: DrawingStatus.APPROVED, version: 3, fileSize: 2_100_000 },
    { projectId: p2.id, name: "Section A–A", type: DrawingType.SECTION, slug: "patil-section-aa", status: DrawingStatus.REVISION_REQUESTED, version: 2, fileSize: 1_560_000 },
    { projectId: p3.id, name: "Clinic Floor Plan — Proposed", type: DrawingType.PLAN, slug: "bhat-clinic-plan", status: DrawingStatus.PENDING_REVIEW, version: 1, fileSize: 1_120_000 },
    { projectId: p4.id, name: "Structural Grid & Columns", type: DrawingType.DETAIL, slug: "nadiger-structural-grid", status: DrawingStatus.APPROVED, version: 1, fileSize: 890_000 },
    { projectId: p5.id, name: "Living–Dining 3D Render", type: DrawingType.RENDER, slug: "joshi-living-render", status: DrawingStatus.APPROVED, version: 2, fileSize: 4_200_000 },
    { projectId: p6.id, name: "Site Plan & Parking Layout", type: DrawingType.PLAN, slug: "vidya-site-plan", status: DrawingStatus.PENDING_REVIEW, version: 1, fileSize: 1_450_000 },
  ];

  for (const d of drawingSpecs) {
    const drawing = await prisma.drawing.create({
      data: {
        projectId: d.projectId,
        name: d.name,
        type: d.type,
        fileUrl: placeholderDrawingUrl(d.slug),
        fileSize: d.fileSize,
        mimeType: "application/pdf",
        version: d.version,
        status: d.status,
        uploadedById: owner.id,
      },
    });
    await prisma.drawingVersion.create({
      data: {
        drawingId: drawing.id,
        version: d.version,
        fileUrl: placeholderDrawingUrl(`${d.slug}-v${d.version}`),
        fileSize: d.fileSize,
        note: d.version > 1 ? `Revision ${d.version}` : "Issued for review",
      },
    });
  }

  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        firmId: firm.id,
        name: "Prakash Sutar",
        phone: "9900112233",
        email: "prakash.sutar@gmail.com",
        projectType: ProjectType.RESIDENTIAL,
        budget: 3200000,
        area: 1600,
        source: LeadSource.INSTAGRAM,
        stage: LeadStage.NEW,
        notes: "Enquiry for duplex near Airport Road.",
        followUpAt: new Date("2025-04-02"),
      },
    }),
    prisma.lead.create({
      data: {
        firmId: firm.id,
        name: "Divya Kamat",
        phone: "9844788990",
        projectType: ProjectType.INTERIOR,
        budget: 1200000,
        area: 1100,
        source: LeadSource.WEBSITE,
        stage: LeadStage.CONTACTED,
        followUpAt: new Date("2025-03-28"),
      },
    }),
    prisma.lead.create({
      data: {
        firmId: firm.id,
        name: "Ravi Moorgeri",
        phone: "9742001122",
        projectType: ProjectType.COMMERCIAL,
        budget: 15000000,
        area: 6000,
        source: LeadSource.REFERRAL,
        stage: LeadStage.SITE_VISIT,
        notes: "Referred by contractor — cafe + co-working.",
        followUpAt: new Date("2025-03-30"),
      },
    }),
    prisma.lead.create({
      data: {
        firmId: firm.id,
        name: "Sneha Mannur",
        phone: "9886677544",
        email: "sneha.mannur@yahoo.in",
        projectType: ProjectType.RESIDENTIAL,
        budget: 5500000,
        area: 2800,
        source: LeadSource.PHONE,
        stage: LeadStage.PROPOSAL_SENT,
      },
    }),
    prisma.lead.create({
      data: {
        firmId: firm.id,
        name: "Kiran Badiger",
        phone: "9986054321",
        projectType: ProjectType.LANDSCAPE,
        budget: 650000,
        area: 3000,
        source: LeadSource.WALKIN,
        stage: LeadStage.NEGOTIATION,
        address: "Deshpande Nagar",
      },
    }),
    prisma.lead.create({
      data: {
        firmId: firm.id,
        name: "Nethra Gouda",
        phone: "9845566778",
        projectType: ProjectType.INSTITUTIONAL,
        budget: 22000000,
        area: 15000,
        source: LeadSource.HOUZZ,
        stage: LeadStage.WON,
        notes: "Moved to formal agreement — NGO learning centre.",
      },
    }),
    prisma.lead.create({
      data: {
        firmId: firm.id,
        name: "Manoj Hiremath",
        phone: "9901234987",
        projectType: ProjectType.RESIDENTIAL,
        budget: 1800000,
        area: 900,
        source: LeadSource.FACEBOOK,
        stage: LeadStage.LOST,
        notes: "Went with a packaged builder.",
      },
    }),
    prisma.lead.create({
      data: {
        firmId: firm.id,
        name: "Pallavi Shirur",
        phone: "9743120987",
        email: "pallavi.shirur@gmail.com",
        projectType: ProjectType.INTERIOR,
        budget: 950000,
        area: 1250,
        source: LeadSource.OTHER,
        stage: LeadStage.NEW,
        notes: "Apartment turnkey — Navanagar.",
      },
    }),
    prisma.lead.create({
      data: {
        firmId: firm.id,
        name: "Basavaraj Angadi",
        phone: "9887766554",
        projectType: ProjectType.COMMERCIAL,
        budget: 7800000,
        area: 3500,
        source: LeadSource.WEBSITE,
        stage: LeadStage.CONTACTED,
        followUpAt: new Date("2025-04-05"),
      },
    }),
    prisma.lead.create({
      data: {
        firmId: firm.id,
        name: "Shweta Toravi",
        phone: "9845011199",
        projectType: ProjectType.RESIDENTIAL,
        budget: 4100000,
        area: 1950,
        source: LeadSource.REFERRAL,
        stage: LeadStage.SITE_VISIT,
      },
    }),
  ]);

  await prisma.vendor.createMany({
    data: [
      {
        firmId: firm.id,
        name: "Shree Basaveshwara Civil Contractors",
        category: VendorCategory.CONTRACTOR,
        phone: "9880123789",
        email: "basaveshwara.civil@gmail.com",
        address: "Gandhi Nagar, Old Hubbali",
        city: "Hubbali",
        gst: "29AABCS1234F1Z1",
        rating: 5,
        notes: "Strong RCC & masonry team.",
      },
      {
        firmId: firm.id,
        name: "Karnataka Tile House",
        category: VendorCategory.TILES,
        phone: "8362234567",
        address: "Koppikar Road",
        city: "Hubbali",
        rating: 4,
        notes: "Vitrified & sanitary display.",
      },
      {
        firmId: firm.id,
        name: "PowerLine Electricals",
        category: VendorCategory.ELECTRICAL,
        phone: "9845088899",
        email: "sales@powerline-hbl.in",
        address: "Deshpande Nagar",
        city: "Hubbali",
        gst: "29ABCDE5678G1Z2",
        rating: 4,
      },
      {
        firmId: firm.id,
        name: "FlowRight Plumbing Solutions",
        category: VendorCategory.PLUMBING,
        phone: "9902468135",
        address: "Vidyanagar",
        city: "Hubbali",
        rating: 5,
      },
      {
        firmId: firm.id,
        name: "ColourCraft Paints & Coatings",
        category: VendorCategory.PAINT,
        phone: "8362378901",
        address: "Gokul Road",
        city: "Hubbali",
        rating: 4,
        notes: "Asian Paints & Berger authorised.",
      },
      {
        firmId: firm.id,
        name: "North Karnataka Steel Traders",
        category: VendorCategory.STEEL,
        phone: "9880456123",
        email: "nksteel@yahoo.in",
        address: "Industrial Estate, Hubbali",
        city: "Hubbali",
        gst: "29STEEL0001H1Z5",
        rating: 4,
      },
    ],
  });

  await prisma.siteUpdate.createMany({
    data: [
      {
        projectId: p2.id,
        userId: owner.id,
        note: "Slab casting for first floor completed; curing in progress.",
        photos: [],
        milestone: ProjectStage.EXECUTION,
        weather: "Clear, 34°C",
      },
      {
        projectId: p5.id,
        userId: owner.id,
        note: "False ceiling layout marked on site; MEP clashes flagged to contractor.",
        photos: [],
        milestone: ProjectStage.EXECUTION,
        weather: "Partly cloudy",
      },
      {
        projectId: p4.id,
        userId: owner.id,
        note: "Steel delivery scheduled for next week; shuttering check done.",
        photos: [],
        milestone: ProjectStage.WORKING_DRAWINGS,
      },
      {
        projectId: p1.id,
        userId: owner.id,
        note: "Client walkthrough of schematic 3D — minor façade tweaks requested.",
        photos: [],
        milestone: ProjectStage.SCHEMATIC,
      },
      {
        projectId: p3.id,
        userId: owner.id,
        note: "Municipal setback verification pending; awaiting NOC copy from client.",
        photos: [],
        milestone: ProjectStage.DESIGN_DEV,
      },
    ],
  });

  const [lead0, lead1, lead2] = leads;

  await prisma.leadActivity.createMany({
    data: [
      {
        leadId: lead0.id,
        userId: owner.id,
        type: ActivityType.WHATSAPP,
        note: "Sent portfolio PDF and fee structure.",
      },
      {
        leadId: lead1.id,
        userId: owner.id,
        type: ActivityType.CALL,
        note: "Discussed timeline — wants start post monsoon.",
      },
      {
        leadId: lead2.id,
        userId: owner.id,
        type: ActivityType.SITE_VISIT,
        note: "Measured plot; shared preliminary FAR notes.",
      },
    ],
  });

  console.log("Seed completed: DesignCraft Studios demo data (Hubbali, Karnataka).");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
