import { Op } from "sequelize";

class ApiFeatures {
  constructor(queryString) {
    this.queryString = queryString;
    this.where = {};
    this.order = [];
    this.attributes = undefined;
    this.limit = 50;
    this.offset = 0;
    this.paginationResult = {};
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields", "keyword"];
    excludedFields.forEach((field) => delete queryObj[field]);

    const operatorsMap = {
      gte: Op.gte,
      gt: Op.gt,
      lte: Op.lte,
      lt: Op.lt,
    };

    const where = {};
    for (const key in queryObj) {
      const value = queryObj[key];

      if (typeof value === "object" && value !== null) {
        const conditions = {};
        for (const opKey in value) {
          if (operatorsMap[opKey]) {
            const raw = value[opKey];
            conditions[operatorsMap[opKey]] = Number.isNaN(Number(raw))
              ? raw
              : Number(raw);
          }
        }
        where[key] = conditions;
      } else {
        where[key] = Number.isNaN(Number(value)) ? value : Number(value);
      }
    }

    this.where = { ...this.where, ...where };
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      this.order = this.queryString.sort.split(",").map((field) => {
        if (field.startsWith("-")) {
          return [field.substring(1), "DESC"];
        }
        return [field, "ASC"];
      });
    } else {
      this.order = [["createdAt", "DESC"]];
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      this.attributes = this.queryString.fields.split(",");
    }
    return this;
  }

  paginate() {
    const page = +this.queryString.page || 1;
    const limit = +this.queryString.limit || 50;
    const offset = (page - 1) * limit;

    this.limit = limit;
    this.offset = offset;

    this.paginationResult.currentPage = page;
    this.paginationResult.limit = limit;

    return this;
  }

  setPaginationResult(documentsCount) {
    this.paginationResult.resultsCount = documentsCount;
    this.paginationResult.pagesCount = Math.ceil(documentsCount / this.limit);
    return this.paginationResult;
  }

  getQueryOptions() {
    return {
      where: this.where,
      order: this.order.length ? this.order : undefined,
      attributes: this.attributes,
      limit: this.limit,
      offset: this.offset,
    };
  }
}

export default ApiFeatures;
