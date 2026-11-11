export interface AuthorSocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
  scholar?: string;
  website?: string;
}

export interface AuthorProfile {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  institution?: string;
  avatar: string;
  bio: string;
  shortBio: string;
  location: string;
  expertise: string[];
  education: string;
  socialLinks: AuthorSocialLinks;
  verified: boolean;
  featuredArticleSlug?: string;
}
