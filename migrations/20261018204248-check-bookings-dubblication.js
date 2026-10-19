/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "UX_Bookings_User_Pending"
      ON "Bookings" (user_id)
      WHERE status = 'pending';
    `);

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION check_booking_overlap()
      RETURNS TRIGGER AS $$
      BEGIN
        -- نتجاهل الحجوزات الملغاة
        IF NEW.status = 'cancelled' THEN
          RETURN NEW;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM "Bookings" b
          WHERE b.room_id = NEW.room_id
            AND b.id <> NEW.id
            AND b.status <> 'cancelled'
            AND NEW.check_in < b.check_out
            AND NEW.check_out > b.check_in
        ) THEN
          RAISE EXCEPTION 'The selected dates overlap with an existing active booking.';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_prevent_booking_overlap
      BEFORE INSERT OR UPDATE
      ON "Bookings"
      FOR EACH ROW
      EXECUTE FUNCTION check_booking_overlap();
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_prevent_booking_overlap ON "Bookings";
    `);

    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS check_booking_overlap();
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "UX_Bookings_User_Pending";
    `);
  },
};
