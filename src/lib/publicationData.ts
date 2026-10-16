import { getConfig } from '@/lib/config';
import { getTomlContent } from '@/lib/content';
import { Author, Publication, PublicationStatus, PublicationType, ResearchArea } from '@/types/publication';

interface RawPublication {
  id: string;
  title: string;
  authors: string[];
  co_first_authors?: string[];
  corresponding_authors?: string[];
  journal?: string;
  conference?: string;
  year: number;
  month?: string;
  type?: PublicationType;
  status?: PublicationStatus;
  pdf?: string;
  pdf_unavailable?: boolean;
  pages?: string;
  preview?: string;
  arxiv?: string;
  github?: string;
  huggingface?: string;
  keywords?: string[];
  tags?: string[];
}

interface PublicationsToml {
  publications?: RawPublication[];
}

function isSameAuthor(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function selectLeadingAuthorPublications(publications: Publication[]) {
  const authorPosition = (pub: Publication) => pub.authors.findIndex(author => author.isHighlighted);
  return publications
    .filter(pub => authorPosition(pub) >= 0 && authorPosition(pub) < 2)
    .sort((a, b) => authorPosition(a) - authorPosition(b));
}

function parseAuthors(raw: RawPublication, highlightName: string): Author[] {
  const coFirstAuthors = raw.co_first_authors || [];
  const correspondingAuthors = raw.corresponding_authors || [];

  return raw.authors.map((name) => ({
    name,
    isHighlighted: isSameAuthor(name, highlightName),
    isCoAuthor: coFirstAuthors.some((author) => isSameAuthor(author, name)),
    isCorresponding: correspondingAuthors.some((author) => isSameAuthor(author, name)),
  }));
}

function detectResearchArea(title: string, keywords: string[] = []): ResearchArea {
  const text = `${title} ${keywords.join(' ')}`.toLowerCase();

  if (text.includes('healthcare') || text.includes('medical') || text.includes('health')) {
    return 'ai-healthcare';
  }
  if (text.includes('graph')) {
    return 'machine-learning';
  }
  if (text.includes('language') || text.includes('llm') || text.includes('question answering')) {
    return 'machine-learning';
  }

  return 'machine-learning';
}

export function loadPublications(filename: string): Publication[] {
  const config = getConfig();
  const data = getTomlContent<PublicationsToml>(filename);
  const publications = data?.publications || [];

  return publications
    .map((pub) => {
      const keywords = pub.keywords || [];

      return {
        id: pub.id,
        title: pub.title,
        authors: parseAuthors(pub, config.author.name),
        journal: pub.journal,
        conference: pub.conference,
        year: pub.year,
        month: pub.month,
        type: pub.type || (pub.conference ? 'conference' : 'preprint'),
        status: pub.status || 'published',
        pages: pub.pages,
        preview: pub.preview,
        arxiv: pub.arxiv,
        github: pub.github,
        huggingface: pub.huggingface,
        pdfUrl: pub.pdf_unavailable ? undefined : pub.pdf,
        pdfUnavailable: pub.pdf_unavailable,
        tags: pub.tags || keywords,
        keywords,
        researchArea: detectResearchArea(pub.title, keywords),
      } satisfies Publication;
    });
}
