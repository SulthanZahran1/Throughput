pub mod vehicle;
pub mod order;
pub mod traffic;
pub mod plant;
pub mod pathfinding;
pub mod simulation;
mod temp_test;

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
