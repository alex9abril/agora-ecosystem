CREATE TABLE IF NOT EXISTS catalog.product_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, name),
    UNIQUE(business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_classifications_business_id ON catalog.product_classifications(business_id);

CREATE TABLE IF NOT EXISTS catalog.product_classification_assignments (
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    classification_id UUID NOT NULL REFERENCES catalog.product_classifications(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, classification_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_pca_business ON catalog.product_classification_assignments(business_id);
