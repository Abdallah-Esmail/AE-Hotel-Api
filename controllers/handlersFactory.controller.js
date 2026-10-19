import asyncWrapper from "../middlewares/asyncWrapper.js";
import appError from "../utils/appError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import httpStatusText from "../utils/httpStatusText.js";

const getAll = (model) =>
  asyncWrapper(async (req, res) => {
    let baseWhere = {};
    if (req.filterObj) {
      baseWhere = req.filterObj;
    }

    const apiFeatures = new ApiFeatures(req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const queryOptions = apiFeatures.getQueryOptions();
    queryOptions.where = { ...queryOptions.where, ...baseWhere };

    const { count, rows } = await model.findAndCountAll(queryOptions);

    const paginationResult = apiFeatures.setPaginationResult(count);

    res.status(200).json({
      results: rows.length,
      paginationResult,
      data: rows,
    });
  });

const getOne = (model) =>
  asyncWrapper(async (req, res, next) => {
    const { id } = req.params;
    const document = await model.findByPk(id);
    if (!document) {
      const error = new appError(
        "document not found",
        404,
        httpStatusText.FAIL,
      );
      return next(error);
    }
    res.status(200).json({
      data: document,
    });
  });

const createOne = (model) =>
  asyncWrapper(async (req, res) => {
    const document = await model.create(req.body);
    res.status(201).json({ data: document });
  });

const updateOne = (model) =>
  asyncWrapper(async (req, res, next) => {
    const document = await model.findByPk(req.params.id);

    if (!document) {
      const error = new appError(
        "Document not found",
        404,
        httpStatusText.FAIL,
      );
      return next(error);
    }

    const updatedDocument = await document.update(req.body);

    return res.status(200).json({
      status: httpStatusText.SUCCESS,
      data: { document: updatedDocument },
    });
  });

const deleteOne = (model) =>
  asyncWrapper(async (req, res, next) => {
    const { id } = req.params;
    const document = await model.findByPk(id);
    if (!document) {
      const error = new appError(
        "document not found",
        404,
        httpStatusText.FAIL,
      );
      return next(error);
    }
    await document.destroy();
    res.status(204).send();
  });

export default { deleteOne, updateOne, createOne, getOne, getAll };
